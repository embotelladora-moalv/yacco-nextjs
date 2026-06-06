export interface Bank {
  id: string;
  name: string;
  accountNumber?: string;
  isActive: boolean;
  createdAt: Date;
}
