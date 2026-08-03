import { useMutation } from '@tanstack/react-query';

import { authService } from '@/services/auth.service';
import type { PhoneSignInFormValues } from '@/utilities/validation/auth.schema';

export function usePhoneSignIn() {
  return useMutation({
    mutationFn: (values: PhoneSignInFormValues) => authService.signInWithPhonePin(values),
  });
}
