import { z } from 'zod';

export const sendMoneySchema = z.object({
  recipientPhone: z.string().min(7, 'Enter a valid phone number'),
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0'),
  note: z.string().max(140).optional(),
});
export type SendMoneyFormValues = z.infer<typeof sendMoneySchema>;
