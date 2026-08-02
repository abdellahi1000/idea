import { useMutation } from '@tanstack/react-query';

import { authService } from '@/services/auth.service';
import type { SignInFormValues } from '@/utilities/validation/auth.schema';

export function useSignIn() {
  return useMutation({
    mutationFn: (values: SignInFormValues) => authService.signIn(values),
  });
}
