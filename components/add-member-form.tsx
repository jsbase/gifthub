import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddMemberFormProps } from '@/types';

const AddMemberForm: React.FC<AddMemberFormProps> = ({
  dict,
  isLoading,
  onSubmit,
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
        required
      />
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
