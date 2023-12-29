import { DBEventPayload, LogStorePayloadType } from "@/types";
import { TransactionReceiptParams } from "ethers";

import environment from "../../config/env";
import { formatHexString, parseEventLog } from "./utilities";

/**
 *  given a certain payload and the reciepts from the transactions find
 *  return the index of teh reciept which contains the actual event
 * @param eventPayload
 * @param transactionReciepts
 */
// ? once in a while transactionReciepts would be an emtpy array and this call will fail
// ? need to investigate why this is or to use our own provider to fetch event reciepts ourselves for more stability
export async function parseTransactionReciept(
  eventPayload: DBEventPayload,
  transactionReciepts: TransactionReceiptParams[]
): Promise<LogStorePayloadType> {
  const blockNumber = eventPayload.block$;
  const lockerContractAddress = environment.contractAddress;
  const event = formatPayloadHexFields(eventPayload);

  // filter all events that do not come from this address
  const relevantReciepts = transactionReciepts.filter(
    (reciept) =>
      reciept.to?.toLowerCase() === lockerContractAddress.toLowerCase()
  );
  console.log(
    `There were ${relevantReciepts.length} transactions to the locker contract found in block:${blockNumber} `
  );
  if (!relevantReciepts.length) {
    console.log("UNKNOWN_ERROR: contract transaction not found in block");
    console.log("debug:payload:", JSON.stringify(eventPayload));
    console.log("debug:reciepts:", transactionReciepts);
  }

  const [foundReciept] = await relevantReciepts
    .map((reciept) => reciept.logs.map(parseEventLog))
    .flat()
    .filter(Boolean)
    .filter((parsedLog) => {
      const { eventParameters: logsEventPayload } = parsedLog;

      const isExactRecieptFound =
        logsEventPayload.account?.toLowerCase() ===
          event.account?.toLowerCase() &&
        logsEventPayload.canisterId === event.canister_id &&
        logsEventPayload.amount?.toString() === event.amount?.toString() &&
        logsEventPayload.chain === event.chain &&
        logsEventPayload.token?.toLowerCase() === event.token?.toLowerCase();

      return isExactRecieptFound;
    });

  if (!foundReciept)
    throw new Error(
      `RECIEPT_NOT_FOUND: event not found in block:${eventPayload.block$} `
    );

  return {
    __logStoreChainId: environment.chainId,
    __logStoreChannelId: "evm-validate",

    address: foundReciept.address,
    blockHash: foundReciept.blockHash,
    data: foundReciept.raw.data,
    logIndex: Number(foundReciept.logIndex),
    topics: foundReciept.raw.topics as string[],
    transactionHash: foundReciept.transactionHash,
  };
}

// properly parse all the hex strings from the DB
export const formatPayloadHexFields = (payload: DBEventPayload) => ({
  ...payload,
  id: formatHexString(payload.id),
  account: formatHexString(payload.account),
  token: formatHexString(payload.token),
});
