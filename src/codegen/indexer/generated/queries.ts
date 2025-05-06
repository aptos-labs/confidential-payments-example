import * as Types from './operations';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';

export const GetActivities = `
    query GetActivities($userAddress: String, $offset: Int, $limit: Int) {
  activities_public(
    where: {_or: [{from_address: {_eq: $userAddress}}, {to_address: {_eq: $userAddress}}]}
    order_by: {txn_version: desc}
    limit: $limit
    offset: $offset
  ) {
    activity_type
    amount
    from_address
    to_address
    txn_timestamp
    txn_version
  }
  transfers_confidential(
    where: {_or: [{from_address: {_eq: $userAddress}}, {to_address: {_eq: $userAddress}}]}
    limit: $limit
    order_by: {txn_version: desc}
    offset: $offset
  ) {
    from_address
    to_address
    txn_timestamp
    txn_version
    amount_ciphertext
  }
}
    `;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) =>
  action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    GetActivities(
      variables?: Types.GetActivitiesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers'],
    ): Promise<Types.GetActivitiesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<Types.GetActivitiesQuery>(GetActivities, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'GetActivities',
        'query',
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
