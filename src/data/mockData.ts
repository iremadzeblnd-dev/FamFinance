import type { Account, Budget, Debt, FamilyMember, MonthlySummary, SavingsGoal, Transaction } from '../types/app'

export const accounts: Account[] = [
  { id: 'cash', name: 'ნაღდი ფული', balance: 1450, icon: 'wallet' },
  { id: 'bank', name: 'საბანკო ანგარიში', balance: 6800, icon: 'bank' },
  { id: 'savings', name: 'დანაზოგი', balance: 3200, icon: 'piggy-bank' },
]

export const familyMembers: FamilyMember[] = [
  { id: 'giorgi', name: 'გიორგი', income: 2500, expense: 1200 },
  { id: 'mariam', name: 'მარიამი', income: 2000, expense: 1670 },
]

export const dashboardSummary = {
  income: 4500,
  expense: 2870,
  remaining: 1630,
  savings: 750,
}

export const transactions: Transaction[] = [
  {
    id: 't-1',
    type: 'expense',
    amount: 85,
    category: 'საკვები',
    description: 'სუპერმარკეტი',
    date: '2026-09-18',
    accountId: 'cash',
    familyMemberId: 'giorgi',
  },
  {
    id: 't-2',
    type: 'income',
    amount: 2500,
    category: 'ხელფასი',
    description: 'ხელფასი',
    date: '2026-09-18',
    accountId: 'bank',
    familyMemberId: 'giorgi',
  },
  {
    id: 't-3',
    type: 'expense',
    amount: 120,
    category: 'საწვავი',
    description: 'ბენზინი',
    date: '2026-09-17',
    accountId: 'cash',
    familyMemberId: 'mariam',
  },
  {
    id: 't-4',
    type: 'expense',
    amount: 180,
    category: 'საყოფაცხოვრებო',
    description: 'კომუნალური',
    date: '2026-09-16',
    accountId: 'bank',
    familyMemberId: 'mariam',
  },
  {
    id: 't-5',
    type: 'income',
    amount: 2000,
    category: 'ბიზნესი',
    description: 'ბიზნესი',
    date: '2026-09-12',
    accountId: 'bank',
    familyMemberId: 'mariam',
  },
  {
    id: 't-6',
    type: 'expense',
    amount: 220,
    category: 'გართობა',
    description: 'დილის გასეირნება',
    date: '2026-09-10',
    accountId: 'cash',
    familyMemberId: 'giorgi',
  },
]

export const budgetData: Budget[] = [
  { category: 'საკვები', spent: 620, limit: 800 },
  { category: 'კომუნალური', spent: 350, limit: 500 },
  { category: 'ტრანსპორტი', spent: 280, limit: 450 },
  { category: 'ჯანმრთელობა', spent: 200, limit: 350 },
  { category: 'განათლება', spent: 150, limit: 300 },
]

export const expenseBreakdown = [
  { name: 'საკვები', value: 920 },
  { name: 'კომუნალური', value: 480 },
  { name: 'ტრანსპორტი', value: 350 },
  { name: 'სესხები', value: 300 },
  { name: 'გართობა', value: 220 },
  { name: 'სხვა', value: 600 },
]

export const installmentData: Debt[] = [
  {
    id: 'd-1',
    title: 'ტელეფონის განვადება',
    totalAmount: 2400,
    monthlyPayment: 200,
    remaining: 1400,
    nextPayment: '2026-10-05',
    type: 'installment',
    status: 'owed',
  },
  {
    id: 'd-2',
    title: 'ბავშვებისთვის ბაღის საფასური',
    totalAmount: 600,
    monthlyPayment: 80,
    remaining: 240,
    nextPayment: '2026-10-08',
    type: 'installment',
    status: 'owed',
  },
  {
    id: 'd-3',
    title: 'სხვა პირი',
    totalAmount: 1500,
    monthlyPayment: 250,
    remaining: 800,
    nextPayment: '2026-10-12',
    type: 'personal',
    status: 'owed_to_me',
  },
  {
    id: 'd-4',
    title: 'ხარჯთაღრიცხვა',
    totalAmount: 800,
    monthlyPayment: 120,
    remaining: 320,
    nextPayment: '2026-10-16',
    type: 'personal',
    status: 'owed',
  },
]

export const savingsGoals: SavingsGoal[] = [
  { id: 's-1', name: 'დასვენება', targetAmount: 3000, currentSaved: 1250, targetDate: '2026-12-15' },
  { id: 's-2', name: 'ახალი ლეპტოპი', targetAmount: 4000, currentSaved: 800, targetDate: '2027-02-10' },
]

export const monthlyStats: MonthlySummary[] = [
  { month: 'აგვისტო', income: 4200, expense: 3200, savings: 1000 },
  { month: 'სექტემბერი', income: 4500, expense: 2870, savings: 1630 },
  { month: 'ოქტომბერი', income: 4700, expense: 2900, savings: 1800 },
  { month: 'ნოემბერი', income: 4800, expense: 3050, savings: 1750 },
]

export const monthlyCategoryBreakdown = [
  { name: 'საკვები', August: 840, September: 920, October: 880 },
  { name: 'კომუნალური', August: 520, September: 480, October: 510 },
  { name: 'ტრანსპორტი', August: 370, September: 350, October: 320 },
  { name: 'სესხები', August: 280, September: 300, October: 340 },
]
