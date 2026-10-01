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
      className={cn('mt-4', 'flex', 'flex-col', 'gap-3')}
    >
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='groupName'>
          {dict.groupName}
        </Label>
        <Input
          name='groupName'
          id='groupName'
          placeholder={dict.enterGroupName}
          required
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='password'>
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
