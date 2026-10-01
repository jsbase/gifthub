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
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('mt-4', 'flex', 'flex-col', 'gap-3')}
    >
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newGroupName'>
          {dict.groupName}
        </Label>
        <Input
          name='newGroupName'
          id='newGroupName'
          placeholder={dict.enterGroupName}
          required
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newPassword'>
          {dict.enterPassword}
        </Label>
        <Input
          name='newPassword'
          id='newPassword'
          type='password'
          placeholder={dict.enterPassword}
          autoComplete='new-password'
          required
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='confirmPassword'>
          {dict.confirmPassword}
        </Label>
        <Input
          name='confirmPassword'
          id='confirmPassword'
          type='password'
          placeholder={dict.confirmPassword}
          autoComplete='new-password'
          required
        />
      </div>
      <Button
        type='submit'
        className={cn('w-full', 'xs:text-base', 'xs:h-12')}
        disabled={isLoading}
        aria-label='SubmitRegister'
        data-testid='SubmitRegister'
      >
        {isLoading ? dict.loading : dict.createGroupBtn}
      </Button>
    </form>
  );
};

export default memo(RegisterForm);
