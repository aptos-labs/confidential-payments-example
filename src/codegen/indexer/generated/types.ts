export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  bigint: bigint;
  numeric: number;
  timestamp: string;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_comparison_exp = {
  _eq: InputMaybe<Scalars['String']>;
  _gt: InputMaybe<Scalars['String']>;
  _gte: InputMaybe<Scalars['String']>;
  /** does the column match the given case-insensitive pattern */
  _ilike: InputMaybe<Scalars['String']>;
  _in: InputMaybe<Array<Scalars['String']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex: InputMaybe<Scalars['String']>;
  _is_null: InputMaybe<Scalars['Boolean']>;
  /** does the column match the given pattern */
  _like: InputMaybe<Scalars['String']>;
  _lt: InputMaybe<Scalars['String']>;
  _lte: InputMaybe<Scalars['String']>;
  _neq: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike: InputMaybe<Scalars['String']>;
  _nin: InputMaybe<Array<Scalars['String']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given pattern */
  _nlike: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar: InputMaybe<Scalars['String']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex: InputMaybe<Scalars['String']>;
  /** does the column match the given SQL regular expression */
  _similar: InputMaybe<Scalars['String']>;
};

/** columns and relationships of "activities_public" */
export type activities_public = {
  __typename?: 'activities_public';
  activity_type: Scalars['String'];
  amount: Scalars['numeric'];
  from_address: Scalars['String'];
  to_address: Scalars['String'];
  txn_timestamp: Scalars['timestamp'];
  txn_version: Scalars['numeric'];
};

/** Boolean expression to filter rows from the table "activities_public". All fields are combined with a logical 'AND'. */
export type activities_public_bool_exp = {
  _and: InputMaybe<Array<activities_public_bool_exp>>;
  _not: InputMaybe<activities_public_bool_exp>;
  _or: InputMaybe<Array<activities_public_bool_exp>>;
  activity_type: InputMaybe<String_comparison_exp>;
  amount: InputMaybe<numeric_comparison_exp>;
  from_address: InputMaybe<String_comparison_exp>;
  to_address: InputMaybe<String_comparison_exp>;
  txn_timestamp: InputMaybe<timestamp_comparison_exp>;
  txn_version: InputMaybe<numeric_comparison_exp>;
};

/** Ordering options when selecting data from "activities_public". */
export type activities_public_order_by = {
  activity_type: InputMaybe<order_by>;
  amount: InputMaybe<order_by>;
  from_address: InputMaybe<order_by>;
  to_address: InputMaybe<order_by>;
  txn_timestamp: InputMaybe<order_by>;
  txn_version: InputMaybe<order_by>;
};

/** select columns of table "activities_public" */
export enum activities_public_select_column {
  /** column name */
  activity_type = 'activity_type',
  /** column name */
  amount = 'amount',
  /** column name */
  from_address = 'from_address',
  /** column name */
  to_address = 'to_address',
  /** column name */
  txn_timestamp = 'txn_timestamp',
  /** column name */
  txn_version = 'txn_version',
}

/** Streaming cursor of the table "activities_public" */
export type activities_public_stream_cursor_input = {
  /** Stream column input with initial value */
  initial_value: activities_public_stream_cursor_value_input;
  /** cursor ordering */
  ordering: InputMaybe<cursor_ordering>;
};

/** Initial value of the column from where the streaming should start */
export type activities_public_stream_cursor_value_input = {
  activity_type: InputMaybe<Scalars['String']>;
  amount: InputMaybe<Scalars['numeric']>;
  from_address: InputMaybe<Scalars['String']>;
  to_address: InputMaybe<Scalars['String']>;
  txn_timestamp: InputMaybe<Scalars['timestamp']>;
  txn_version: InputMaybe<Scalars['numeric']>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type bigint_comparison_exp = {
  _eq: InputMaybe<Scalars['bigint']>;
  _gt: InputMaybe<Scalars['bigint']>;
  _gte: InputMaybe<Scalars['bigint']>;
  _in: InputMaybe<Array<Scalars['bigint']>>;
  _is_null: InputMaybe<Scalars['Boolean']>;
  _lt: InputMaybe<Scalars['bigint']>;
  _lte: InputMaybe<Scalars['bigint']>;
  _neq: InputMaybe<Scalars['bigint']>;
  _nin: InputMaybe<Array<Scalars['bigint']>>;
};

/** ordering argument of a cursor */
export enum cursor_ordering {
  /** ascending ordering of the cursor */
  ASC = 'ASC',
  /** descending ordering of the cursor */
  DESC = 'DESC',
}

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type numeric_comparison_exp = {
  _eq: InputMaybe<Scalars['numeric']>;
  _gt: InputMaybe<Scalars['numeric']>;
  _gte: InputMaybe<Scalars['numeric']>;
  _in: InputMaybe<Array<Scalars['numeric']>>;
  _is_null: InputMaybe<Scalars['Boolean']>;
  _lt: InputMaybe<Scalars['numeric']>;
  _lte: InputMaybe<Scalars['numeric']>;
  _neq: InputMaybe<Scalars['numeric']>;
  _nin: InputMaybe<Array<Scalars['numeric']>>;
};

/** column ordering options */
export enum order_by {
  /** in ascending order, nulls last */
  asc = 'asc',
  /** in ascending order, nulls first */
  asc_nulls_first = 'asc_nulls_first',
  /** in ascending order, nulls last */
  asc_nulls_last = 'asc_nulls_last',
  /** in descending order, nulls first */
  desc = 'desc',
  /** in descending order, nulls first */
  desc_nulls_first = 'desc_nulls_first',
  /** in descending order, nulls last */
  desc_nulls_last = 'desc_nulls_last',
}

/** columns and relationships of "processor_status" */
export type processor_status = {
  __typename?: 'processor_status';
  last_success_version: Scalars['bigint'];
  last_transaction_timestamp: Maybe<Scalars['timestamp']>;
  last_updated: Scalars['timestamp'];
};

/** Boolean expression to filter rows from the table "processor_status". All fields are combined with a logical 'AND'. */
export type processor_status_bool_exp = {
  _and: InputMaybe<Array<processor_status_bool_exp>>;
  _not: InputMaybe<processor_status_bool_exp>;
  _or: InputMaybe<Array<processor_status_bool_exp>>;
  last_success_version: InputMaybe<bigint_comparison_exp>;
  last_transaction_timestamp: InputMaybe<timestamp_comparison_exp>;
  last_updated: InputMaybe<timestamp_comparison_exp>;
};

/** Ordering options when selecting data from "processor_status". */
export type processor_status_order_by = {
  last_success_version: InputMaybe<order_by>;
  last_transaction_timestamp: InputMaybe<order_by>;
  last_updated: InputMaybe<order_by>;
};

/** select columns of table "processor_status" */
export enum processor_status_select_column {
  /** column name */
  last_success_version = 'last_success_version',
  /** column name */
  last_transaction_timestamp = 'last_transaction_timestamp',
  /** column name */
  last_updated = 'last_updated',
}

/** Streaming cursor of the table "processor_status" */
export type processor_status_stream_cursor_input = {
  /** Stream column input with initial value */
  initial_value: processor_status_stream_cursor_value_input;
  /** cursor ordering */
  ordering: InputMaybe<cursor_ordering>;
};

/** Initial value of the column from where the streaming should start */
export type processor_status_stream_cursor_value_input = {
  last_success_version: InputMaybe<Scalars['bigint']>;
  last_transaction_timestamp: InputMaybe<Scalars['timestamp']>;
  last_updated: InputMaybe<Scalars['timestamp']>;
};

export type query_root = {
  __typename?: 'query_root';
  /** fetch data from the table: "activities_public" */
  activities_public: Array<activities_public>;
  /** fetch data from the table: "processor_status" */
  processor_status: Array<processor_status>;
  /** fetch data from the table: "transfers_confidential" */
  transfers_confidential: Array<transfers_confidential>;
};

export type query_rootactivities_publicArgs = {
  distinct_on: InputMaybe<Array<activities_public_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<activities_public_order_by>>;
  where: InputMaybe<activities_public_bool_exp>;
};

export type query_rootprocessor_statusArgs = {
  distinct_on: InputMaybe<Array<processor_status_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<processor_status_order_by>>;
  where: InputMaybe<processor_status_bool_exp>;
};

export type query_roottransfers_confidentialArgs = {
  distinct_on: InputMaybe<Array<transfers_confidential_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<transfers_confidential_order_by>>;
  where: InputMaybe<transfers_confidential_bool_exp>;
};

export type subscription_root = {
  __typename?: 'subscription_root';
  /** fetch data from the table: "activities_public" */
  activities_public: Array<activities_public>;
  /** fetch data from the table in a streaming manner: "activities_public" */
  activities_public_stream: Array<activities_public>;
  /** fetch data from the table: "processor_status" */
  processor_status: Array<processor_status>;
  /** fetch data from the table in a streaming manner: "processor_status" */
  processor_status_stream: Array<processor_status>;
  /** fetch data from the table: "transfers_confidential" */
  transfers_confidential: Array<transfers_confidential>;
  /** fetch data from the table in a streaming manner: "transfers_confidential" */
  transfers_confidential_stream: Array<transfers_confidential>;
};

export type subscription_rootactivities_publicArgs = {
  distinct_on: InputMaybe<Array<activities_public_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<activities_public_order_by>>;
  where: InputMaybe<activities_public_bool_exp>;
};

export type subscription_rootactivities_public_streamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<activities_public_stream_cursor_input>>;
  where: InputMaybe<activities_public_bool_exp>;
};

export type subscription_rootprocessor_statusArgs = {
  distinct_on: InputMaybe<Array<processor_status_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<processor_status_order_by>>;
  where: InputMaybe<processor_status_bool_exp>;
};

export type subscription_rootprocessor_status_streamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<processor_status_stream_cursor_input>>;
  where: InputMaybe<processor_status_bool_exp>;
};

export type subscription_roottransfers_confidentialArgs = {
  distinct_on: InputMaybe<Array<transfers_confidential_select_column>>;
  limit: InputMaybe<Scalars['Int']>;
  offset: InputMaybe<Scalars['Int']>;
  order_by: InputMaybe<Array<transfers_confidential_order_by>>;
  where: InputMaybe<transfers_confidential_bool_exp>;
};

export type subscription_roottransfers_confidential_streamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<transfers_confidential_stream_cursor_input>>;
  where: InputMaybe<transfers_confidential_bool_exp>;
};

/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
export type timestamp_comparison_exp = {
  _eq: InputMaybe<Scalars['timestamp']>;
  _gt: InputMaybe<Scalars['timestamp']>;
  _gte: InputMaybe<Scalars['timestamp']>;
  _in: InputMaybe<Array<Scalars['timestamp']>>;
  _is_null: InputMaybe<Scalars['Boolean']>;
  _lt: InputMaybe<Scalars['timestamp']>;
  _lte: InputMaybe<Scalars['timestamp']>;
  _neq: InputMaybe<Scalars['timestamp']>;
  _nin: InputMaybe<Array<Scalars['timestamp']>>;
};

/** columns and relationships of "transfers_confidential" */
export type transfers_confidential = {
  __typename?: 'transfers_confidential';
  amount_ciphertext_recipient: Scalars['String'];
  amount_ciphertext_sender: Scalars['String'];
  from_address: Scalars['String'];
  to_address: Scalars['String'];
  txn_timestamp: Scalars['timestamp'];
  txn_version: Scalars['numeric'];
};

/** Boolean expression to filter rows from the table "transfers_confidential". All fields are combined with a logical 'AND'. */
export type transfers_confidential_bool_exp = {
  _and: InputMaybe<Array<transfers_confidential_bool_exp>>;
  _not: InputMaybe<transfers_confidential_bool_exp>;
  _or: InputMaybe<Array<transfers_confidential_bool_exp>>;
  amount_ciphertext_recipient: InputMaybe<String_comparison_exp>;
  amount_ciphertext_sender: InputMaybe<String_comparison_exp>;
  from_address: InputMaybe<String_comparison_exp>;
  to_address: InputMaybe<String_comparison_exp>;
  txn_timestamp: InputMaybe<timestamp_comparison_exp>;
  txn_version: InputMaybe<numeric_comparison_exp>;
};

/** Ordering options when selecting data from "transfers_confidential". */
export type transfers_confidential_order_by = {
  amount_ciphertext_recipient: InputMaybe<order_by>;
  amount_ciphertext_sender: InputMaybe<order_by>;
  from_address: InputMaybe<order_by>;
  to_address: InputMaybe<order_by>;
  txn_timestamp: InputMaybe<order_by>;
  txn_version: InputMaybe<order_by>;
};

/** select columns of table "transfers_confidential" */
export enum transfers_confidential_select_column {
  /** column name */
  amount_ciphertext_recipient = 'amount_ciphertext_recipient',
  /** column name */
  amount_ciphertext_sender = 'amount_ciphertext_sender',
  /** column name */
  from_address = 'from_address',
  /** column name */
  to_address = 'to_address',
  /** column name */
  txn_timestamp = 'txn_timestamp',
  /** column name */
  txn_version = 'txn_version',
}

/** Streaming cursor of the table "transfers_confidential" */
export type transfers_confidential_stream_cursor_input = {
  /** Stream column input with initial value */
  initial_value: transfers_confidential_stream_cursor_value_input;
  /** cursor ordering */
  ordering: InputMaybe<cursor_ordering>;
};

/** Initial value of the column from where the streaming should start */
export type transfers_confidential_stream_cursor_value_input = {
  amount_ciphertext_recipient: InputMaybe<Scalars['String']>;
  amount_ciphertext_sender: InputMaybe<Scalars['String']>;
  from_address: InputMaybe<Scalars['String']>;
  to_address: InputMaybe<Scalars['String']>;
  txn_timestamp: InputMaybe<Scalars['timestamp']>;
  txn_version: InputMaybe<Scalars['numeric']>;
};
