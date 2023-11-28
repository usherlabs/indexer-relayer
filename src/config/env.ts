const environment = {
  postgresConnectionString: process.env.POSTGRES_CONNECTION_URL,
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  logstoreStreamId: process.env.LOGSTORE_STREAM_ID,
  contractAddress: process.env.CONTRACT_ADDRESS,
  chainId: process.env.CHAIN_ID,
  topicStream: "0xddc5f79ecab7f6a5c66dce62fbac574de1d4797c/lsan-events",
};

export default environment;
