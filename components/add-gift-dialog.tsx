"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Member } from "@/types";

export function AddGiftDialog({ forMemberId }: { forMemberId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState(forMemberId || '');

  useEffect(() => {
    // Fetch members when dialog opens
    if (isOpen && !forMemberId) {
      fetch('/api/members')
        .then(res => res.json())
        .then(data => setMembers(data.members))
        .catch(error => toast.error('Failed to load members'));
    }
  }, [isOpen, forMemberId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const gift = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      url: formData.get('url') as string,
      forMemberId: forMemberId || selectedMember,
    };

    try {
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gift),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add gift');
      }

      toast.success('Gift added successfully');
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add gift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Gift className="h-4 w-4 mr-2" />
          Add Gift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Gift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!forMemberId && (
            <div className="space-y-2">
              <Label htmlFor="member">For Member</Label>
              <Select
                value={selectedMember}
                onValueChange={setSelectedMember}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Gift Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter gift title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter gift description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL (Optional)</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="Enter gift URL"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Gift'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}