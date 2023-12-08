import environment from "@/config/env";
import {
  DBEventPayload,
  EthereumBlockRow,
  LogStorePayloadType,
  NotificationResponseMessage,
} from "@/types";
import { CACHE_SUFFIXES } from "@/utils/constants";
import { parseTransactionReciept } from "@/utils/functions/events";
import {
  buildBlockNumberQuery,
  CREATE_TRIGGER_QUERY,
  LISTEN_TO_TRIGGER_QUERY,
} from "@/utils/queries";
import CCAMPClient, { ENV, ProtocolDataCollectionCanister } from "@ccamp/lib";
import LogStoreClient, { MessageMetadata } from "@logsn/client";
import { Client as DBClient, QueryResult } from "pg";
import { createClient } from "redis";
import logger, { STANDARD_LEVELS } from "simple-node-logger";

export class PostgresHelper {
  private _cache;
  private _db: DBClient;
  private _logstoreClient: LogStoreClient;
  public ccampClient: CCAMPClient;
  public logger: logger.Logger;

  constructor(
    connectionString: string,
    evmPrivateKey: string,
    { env } = { env: ENV.prod }
  ) {
    this._db = new DBClient(connectionString);
    this._cache = createClient();
    this.ccampClient = new CCAMPClient(evmPrivateKey, { env });
    this._logstoreClient = new LogStoreClient({
      auth: { privateKey: evmPrivateKey },
    });
    this.logger = logger.createSimpleLogger('project.log');

    this.logger.setLevel(environment.logLevel as STANDARD_LEVELS);

    // connect to the db and cache
    this._db.connect();
    this._cache.connect();
  }

  public async log(text: string) {
    this.logger.info(text);
  }

  public async listen() {
    // add notify listeners to relevant
    await this._db.query(CREATE_TRIGGER_QUERY);
    await this._db.query(LISTEN_TO_TRIGGER_QUERY);

    // listen for new events from the DB
    this._db.on("notification", (data: NotificationResponseMessage) => {
      this._handleNewIndex(data);
    });

    // listen for broadcasts over the validation stream
    this._logstoreClient.subscribe(
      environment.topicStream,
      this._handleNewValidationData.bind(this)
    );

    this.log("Listening for inserts into the postgres database");
  }

  public async getBlockByNumber(
    blockNumber: string | number
  ): Promise<EthereumBlockRow> {
    const queryString = buildBlockNumberQuery(blockNumber.toString());
    const response = await this._query(queryString);

    if (!response.rowCount)
      throw new Error(
        `BLOCK_NOT_FOUND: Block with number ${blockNumber} not found`
      );

    return response.rows[0];
  }

  private async _publishDataToLogstore(payload: Record<string, unknown>) {
    const stream = await this._logstoreClient.getStream(
      environment.logstoreStreamId
    );
    const response = await stream.publish(payload);

    return response;
  }

  private async _query(queryString: string): Promise<QueryResult<any>> {
    return this._db.query(queryString);
  }

  public async _handleNewIndex(data: NotificationResponseMessage) {
    try {
      const { payload } = data;

      this.log(`Recieved a payload of :${JSON.stringify(data)}`);
      const eventPayload = JSON.parse(payload) as DBEventPayload;
      const blockDetails = await this.getBlockByNumber(eventPayload.block$);
      const parsedTxnPayload = await parseTransactionReciept(
        eventPayload,
        blockDetails.data.transaction_receipts
      );

      // push to logstore
      this.log("Publishing payload to logstore");
      const signedPayload = await this._publishDataToLogstore(parsedTxnPayload);

      // add to cache
      this.log("Caching data in storage");
      const key = this._generateCacheKeyFromPayload(
        signedPayload.content as LogStorePayloadType,
        CACHE_SUFFIXES.SOURCE_EVENT
      );
      await this._cache.set(key, JSON.stringify(signedPayload));

      return signedPayload;
    } catch (err) {
      this.log(`There was an error:${err.message}`);
      this.log(err);
    }
  }

  private async _handleNewValidationData(
    content: LogStorePayloadType,
    metadata: MessageMetadata
  ) {
    const payload = { content, metadata };
    const validatedItemsKey = this._generateCacheKeyFromPayload(
      content,
      CACHE_SUFFIXES.VALIDATOR_EVENT
    );
    const sourceItemKey = this._generateCacheKeyFromPayload(
      content,
      CACHE_SUFFIXES.SOURCE_EVENT
    );
    this.log(
      `Event:${sourceItemKey} has recieved a validation from the network`
    );

    // check if there is a corresponding source item
    // if there isnt then this payload isnt for us
    const sourceItem = await this._cache.get(sourceItemKey);
    const parsedSourceItem = JSON.parse(sourceItem);
    if (!sourceItem) return;

    // store item in cache
    const existingContent = await this._cache.get(validatedItemsKey);
    if (!existingContent) {
      await this._cache.set(validatedItemsKey, JSON.stringify([payload]));
    } else {
      const updatedPayload = [payload, ...JSON.parse(existingContent)];
      await this._cache.set(validatedItemsKey, JSON.stringify(updatedPayload));
    }

    // validate that the response treshold is met
    const validatedItems = await this._cache.get(validatedItemsKey);
    const parsedValidatedData = JSON.parse(validatedItems);
    const itemCount = parsedValidatedData.length;

    if (itemCount < environment.responseTreshold) return;
    this.log(
      `Event:${sourceItemKey} has enough validations and would be pushed to the canisters`
    );

    // TODO push to ccamp
    const { pdcCanister }: { pdcCanister: ProtocolDataCollectionCanister } =
      this.ccampClient.getCCampCanisters();

    await pdcCanister.process_event(
      JSON.stringify({
        source: parsedSourceItem,
        validation: parsedValidatedData,
      })
    );
    this.log(`Event:${sourceItemKey} succesfully pushed to logstore`);

    // clear the cache
    await this._cache.del(sourceItemKey);
    await this._cache.del(validatedItemsKey);
    this.log(`Cache for Event:${sourceItemKey} succesfully cleared`);
  }

  private _generateCacheKeyFromPayload(
    payload: LogStorePayloadType,
    source: string
  ) {
    return `${source}-${payload.transactionHash}-${payload.blockHash}-${payload.logIndex}`;
  }
}
