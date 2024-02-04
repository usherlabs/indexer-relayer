# Usher Labs' Indexer Relayer

## Purpose

**To obtain attestations about the validity of EVM (Ethereum Virtual Machine) events indexed by the Graph Node, and then propagate these attestations to destination blockchains, such as the Internet Computer Protocol (ICP).**

The Indexer Relayer is designed to operate in a centralized environment and plays a pivotal role in ensuring the authenticity and integrity of events originating from a Graph Node (EVM Indexer). Its primary function is to facilitate the secure integration of these events into blockchain environments, such as the Internet Computer (ICP). While the Indexer Relayer serves as a gatekeeper for validating events before they enter the ICP ecosystem, the responsibility for verifying the validity proofs produced by the Nodes within the Log Store Network rests with the destination blockchains. The current implementation of the Indexer Relayer supports indexing via the Graph Node and sinking into blockchains like the Internet Computer. However, this paradigm is designed to evolve, potentially supporting other indexers and sinking validity proofs into any blockchain capable of verifying ECDSA signed messages.

The Indexer Relayer currently powers blockchain interoperability within the [Cross-Chain Asset Management Protocol](https://github.com/usherlabs/ccamp).

## Workflow

1. **Database Connection:**
   The validation process begins with the Indexer Relayer establishing a secure connection with the database of the operational Graph Node. This connection provides access to events for validation as they are inserted into the database, including sending PostgreSQL notifications for new inserts into specific databases and tables.  
2. **Listening for New Indexes:**
   The Indexer Relayer continuously monitors the Graph Node for new indexes, ensuring it remains synchronized with the latest blocks and ready to validate newly indexed events.  
3. **Event Validation through Log Store:**
   Upon detecting a new index, the Indexer Relayer initiates the process of sending the corresponding event to the Log Store for meticulous validation. Nodes within the Log Store Network scrutinize the event, verifying its authenticity and ensuring it meets predefined validation criteria.  
4. **Validation Response:**
   The Log Store Network promptly responds, delivering a validated payload as proof of the event's legitimacy. This phase serves as a quality assurance checkpoint, ensuring that only validated events are sent to the canister for balance updates.  
5. **Integration with Protocol Data Collection Canister:**
   The validation process culminates when a sufficient number of validations are received from the Log Store Network. When the threshold of validations is surpassed, the source event and validations are sent to the Protocol Data Collection Canister for the corresponding balance updates. This is done using the ccamp SDK, which facilitates calling the appropriate method on the canister.  

## Running the code

- yarn install
- npm run start

## Simplifying the Complexity

Behind this sophisticated process lies the `Client` class, a TypeScript powerhouse. This class, with its intricate orchestration, interfaces seamlessly with PostgreSQL databases, Redis caches, CCAMP and the LogStore for validation of events.

## Getting Started with the code [loom](https://www.loom.com/share/b80608d87b7b4fcaa3f139fbe05365ce?sid=cab4c2df-eb95-41e7-8422-c6743440b39c)

Initializing the indexer-relayer is a straightforward process:

```typescript
// Example instantiation of the indexer-relayer
const eventValidator = new PostgresHelper(connectionString, evmPrivateKey);

// Start listening for new events
eventValidator.listen();
```

## Publications

- [Graph Node powered Blockchain Attestation Oracle](https://forum.thegraph.com/t/introducing-the-indexerrelayer-graph-node-powered-blockchain-attestation-oracle/5153) - Jan 15 2024
- [Empowering Subgraphs with Verifiable Confirmations](https://forum.thegraph.com/t/empowering-subgraphs-with-verifiable-confirmations/4738) - Nov 1 2023