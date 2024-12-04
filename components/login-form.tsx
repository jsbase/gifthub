'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LoginFormProps } from '@/types';

const LoginForm: React.FC<LoginFormProps> = ({ dict, isLoading, onSubmit }) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('space-y-dialog-desktop', 'xs:space-y-dialog-mobile')}
    >
      <div className='space-y-2'>
        <Label className='sr-only' htmlFor='groupName'>
          {dict.groupName}
        </Label>
        <Input
          name='groupName'
          id='groupName'
          placeholder={dict.groupName}
          required
        />
      </div>
      <div className='space-y-2'>
        <Label className='sr-only' htmlFor='password'>
          {dict.enterPassword}
        </Label>
        <Input
          name='password'
          id='password'
          type='password'
          placeholder={dict.enterPassword}
          autoComplete='current-password'
          required
        />
      </div>
      <Button
        type='submit'
        className={cn('w-full', 'xs:text-base', 'xs:h-12')}
        disabled={isLoading}
        aria-label='SubmitLogin'
        data-testid='SubmitLogin'
      >
        {isLoading ? dict.loading : dict.login}
      </Button>
    </form>
  );
};

export default memo(LoginForm);
