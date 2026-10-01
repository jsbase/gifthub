import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddMemberFormProps } from '@/types';

const AddMemberForm: React.FC<AddMemberFormProps> = ({
  dict,
  isLoading,
  onSubmit,
  nameError,
  onNameChange,
}) => (
  <form onSubmit={onSubmit} className='mt-4 space-y-4'>
    <div className='flex flex-col gap-1.5'>
      <Label className='label-print text-caption' htmlFor='name'>
        {dict.enterMemberName}
      </Label>
      <Input
        id='name'
        name='name'
        type='text'
        placeholder={dict.enterMemberName}
        onChange={onNameChange}
        aria-invalid={nameError ? true : undefined}
        aria-describedby={nameError ? 'memberNameError' : undefined}
        required
      />
      {/*
        Set on the field, not in a toast. A name the server refuses is still a
        form the user is standing in front of, and a toast that leaves in four
        seconds is not something they can read, act on and come back to. The
        text is whatever locale the page is in, and `aria-describedby` above
        points the input at it so the two are announced as one thing.
      */}
      {nameError && (
        <p
          id='memberNameError'
          role='alert'
          data-testid='memberNameError'
          className='text-destructive text-[0.875rem] leading-snug'
        >
          {nameError}
        </p>
      )}
    </div>
    <Button
      type='submit'
      className='w-full'
      disabled={isLoading}
      data-testid='memberNameSubmit'
    >
      {isLoading ? dict.adding : dict.addMember}
    </Button>
  </form>
);

export default memo(AddMemberForm);