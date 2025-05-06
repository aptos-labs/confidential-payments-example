import * as Types from './types';

export type GetActivitiesQueryVariables = Types.Exact<{
  userAddress?: Types.InputMaybe<Types.Scalars['String']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;

export type GetActivitiesQuery = {
  __typename?: 'query_root';
  activities_public: Array<{
    __typename?: 'activities_public';
    activity_type: string;
    amount: any;
    from_address: string;
    to_address: string;
    txn_timestamp: any;
    txn_version: any;
  }>;
  transfers_confidential: Array<{
    __typename?: 'transfers_confidential';
    from_address: string;
    to_address: string;
    txn_timestamp: any;
    txn_version: any;
    amount_ciphertext: string;
  }>;
};
