'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { RegisterFormProps } from '@/types';

const RegisterForm: React.FC<RegisterFormProps> = ({
  dict,
  isLoading,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className={cn(
      "space-y-dialog-desktop",
      "xs:space-y-dialog-mobile"
    )}>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="newGroupName">{dict.groupName}</Label>
        <Input
          name="newGroupName"
          id="newGroupName"
          placeholder={dict.groupName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="newPassword">{dict.enterPassword}</Label>
        <Input
          name="newPassword"
          id="newPassword"
          type="password"
          placeholder={dict.enterPassword}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="confirmPassword">{dict.confirmPassword}</Label>
        <Input
          name="confirmPassword"
          id="confirmPassword"
          type="password"
          placeholder={dict.confirmPassword}
          autoComplete="new-password"
          required
        />
      </div>
      <Button
        type="submit"
        className={cn("w-full", "xs:text-base", "xs:h-12")}
        disabled={isLoading}
        aria-label="SubmitRegister"
        data-testid="SubmitRegister"
      >
        {isLoading ? dict.loading : dict.createGroupBtn}
      </Button>
    </form>
  );
};

export default memo(RegisterForm);
