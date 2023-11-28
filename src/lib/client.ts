import environment from "@/config/env";
import {
  DBEventPayload,
  EthereumBlockRow,
  LogStorePayloadType,
  NotificationResponseMessage,
} from "@/types";
import { parseTransactionReciept } from "@/utils/functions/events";
import {
  buildBlockNumberQuery,
  CREATE_TRIGGER_QUERY,
  LISTEN_TO_TRIGGER_QUERY,
} from "@/utils/queries";
import LogStoreClient from "@logsn/client";
import { Client as DBClient, QueryResult } from "pg";
import { createClient } from "redis";

export class PostgresHelper {
  private _db: DBClient;
  private _logstoreClient: LogStoreClient;
  private _cache;

  constructor(connectionString: string, evmPrivateKey: string) {
    this._db = new DBClient(connectionString);
    this._cache = createClient();
    this._logstoreClient = new LogStoreClient({
      auth: { privateKey: evmPrivateKey },
    });

    this._db.connect();
    this._cache.connect();
  }

  public async log(text: string) {
    // TODO change to actual logger
    console.log(text);
  }

  public async listen() {
    await this._db.query(CREATE_TRIGGER_QUERY);
    await this._db.query(LISTEN_TO_TRIGGER_QUERY);

    // listen for new events from the DB
    this._db.on("notification", (data: NotificationResponseMessage) => {
      this._handleNewIndex(data);
    });

    // listen for broadcasts over the validation stream
    this._logstoreClient.subscribe(
      environment.topicStream,
      this._handleNewValidationData
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

  private async _handleNewIndex(data: NotificationResponseMessage) {
    try {
      const { payload } = data;
      const client = this as PostgresHelper;

      client.log(`Recieved a payload of :${JSON.stringify(data)}`);

      const eventPayload = JSON.parse(payload) as DBEventPayload;
      const blockDetails = await client.getBlockByNumber(eventPayload.block$);

      const parsedTxnPayload = await parseTransactionReciept(
        eventPayload,
        blockDetails.data.transaction_receipts
      );

      // push to logstore
      await this._publishDataToLogstore(parsedTxnPayload);

      // add to cache
      const key = await this._generateCacheKeyFromPayload(parsedTxnPayload);
      const value = await this._signPayload(parsedTxnPayload);
      await this._cache.set(key, JSON.stringify(value));
    } catch (err) {
      console.log(`There was an error:${err.message}`);
      console.log(err);
    }
  }

  private async _handleNewValidationData(data: unknown) {
    // get the corresponding data from the cache
    // if it exists push both the initial data and the validation to the ccamp network
  }

  private async _generateCacheKeyFromPayload(payload: LogStorePayloadType) {
    return `${payload.transactionHash}-${payload.blockHash}-${payload.index}`;
  }

  private async _signPayload(payload: LogStorePayloadType) {
    // TODO research how streamr generates signatures for the message
    return payload;
  }
}
