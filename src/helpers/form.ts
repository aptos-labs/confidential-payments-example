import { formatUnits } from 'ethers';
import * as Yup from 'yup';

/**
 * Common helper to get a yup schema for an amount field.
 */
export function getYupAmountField(
  yup: typeof Yup,
  decimals: number,
  totalBalanceBN: bigint,
  symbol: string,
) {
  return yup
    .number()
    .min(
      +formatUnits('1', decimals),
      `Amount must be greater than ${formatUnits('1', decimals)} ${symbol}.`,
    )
    .test(
      'maxDecimals',
      `Amount cannot have more than ${decimals} decimal places.`,
      value => {
        if (value === undefined || value === null) return true;
        const valueStr = value.toString();
        const decimalIndex = valueStr.indexOf('.');
        if (decimalIndex === -1) return true;
        const decimalPlaces = valueStr.length - decimalIndex - 1;
        return decimalPlaces <= decimals;
      },
    )
    .test('maxAmount', (value, { createError, path }) => {
      if (value === undefined || value === null) return true;
      if (value > +formatUnits(totalBalanceBN, decimals))
        return createError({
          path,
          message: `Amount cannot be greater than current balance: ${formatUnits(totalBalanceBN, decimals)} ${symbol}.`,
        });
      else return true;
    })
    .required('Enter amount');
}
