# indexer-relayer: Obtain attestations about the validity of EVM events indexed by Graph Node and then propagate it to a destination blockchain like the ICP

## Purpose

The indexer-relayer plays a pivotal role in ensuring the authenticity and integrity of events originating from a graph node, facilitating their secure integration into the Internet Computer Protocol (ICP) environment. Beyond mere validation, its purpose is to serve as a gatekeeper, validating events before ushering them into the ICP ecosystem via a canister.

## Workflow

1. **Database Connection:**
   - To kickstart the validation process, the indexer-relayer establishes a secure connection with the database instance associated with the operational graph node. This connection serves as the foundational link, providing access to the events that are to be validated as they are inserted into the database by running a query to send a postgres notification when there is a new insert into certain databases and tables..

2. **Listening for New Indexes:**
   - The indexer-relayer assumes an active role by continuously monitoring the graph node for new indexes. This ensures that it stays synchronized with the latest blocks, ready to validate newly indexed events.

3. **Event Validation through LogStore:**
   - Upon detecting a new index, the indexer-relayer initiates a process for sending the corresponding event to the LogStore for meticulous validation. Here, broker nodes within the LogStore network scrutinize the event, verifying its authenticity and ensuring its compliance with predefined validation criteria.

4. **Validation Response:**
   - The LogStore network's broker nodes respond promptly, delivering a validated payload as a testament to the event's legitimacy. This phase serves as a quality assurance checkpoint, confirming that only validated events are going to be sent to the canister for balance update.

5. **Integration with Protocol Data Collection Canister:**
   - The culmination of the validation process occurs as we get enough validations from the logstore network. When the number of validations recieved surpasses a certain treshold, the source event emitted and the validations would be sent to the protocol data collection canister for the corresponding balance updates using the ccamp SDK which can be used to call the appropriate method for the canister.

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
