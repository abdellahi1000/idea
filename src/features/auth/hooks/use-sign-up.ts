import { useMutation } from '@tanstack/react-query';

import { authService } from '@/services/auth.service';
import type { SignUpFormValues } from '@/utilities/validation/auth.schema';

export function useSignUp() {
  return useMutation({
    mutationFn: (values: SignUpFormValues) => authService.signUp(values),
  });
}
