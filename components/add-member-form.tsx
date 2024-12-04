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
  <form onSubmit={onSubmit} className='space-y-4'>
    <div className='space-y-2'>
      <Label className='sr-only' htmlFor='name'>
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
    <Button type='submit' className='w-full' disabled={isLoading}>
      {isLoading ? dict.adding : dict.addMember}
    </Button>
  </form>
);

export default memo(AddMemberForm);
