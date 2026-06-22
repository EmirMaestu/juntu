export type Currency = 'ARS' | 'USD' | 'EUR'

export interface Me {
  id: number
  name: string
  username: string
  color?: string
  scope: string
  others: { name: string; scope_value: string }[]
}

export interface Balance { currency: Currency; balance: number }

export interface Account {
  id: number
  name: string
  type: 'efectivo' | 'billetera' | 'credito' | 'banco' | 'inversion'
  color?: string
  icon?: string
  active: number
  closing_day?: number | null
  due_day?: number | null
  balances?: Balance[]
}

export interface CategoryTotal { cat: string; color?: string; total: number }

export interface HoyItem { tipo: string; titulo: string; sub: string; hora: string }

export interface Overview2 {
  patrimonio_ars: number
  patrimonio_usd: number | null
  blue: number
  gasto_mes: number
  gasto_prev_alt: number
  ingreso_mes: number
  cuotas_futuras: number
  cuotas_n: number
  cashflow: { ym: string; ingresos: number; gastos: number }[]
  hoy_items: HoyItem[]
  por_categoria: CategoryTotal[]
  mes_nombre?: string
  year?: number
}

export interface Transaction {
  id: number
  type: 'gasto' | 'ingreso'
  amount: number
  currency: Currency
  description: string
  occurred_at: string
  account_id: number
  account_name?: string
  category_id?: number | null
  category_name?: string | null
}

export interface Category {
  id: number
  name: string
  color?: string
  icon?: string
}

export interface Recurring {
  id: number
  description: string
  amount: number
  currency: Currency
  account_id: number
  next_occurrence: string
  active: number
  total_installments?: number | null
  installments_fired?: number | null
}

export interface VencimientoCard {
  account_id: number
  account_name: string
  due_date: string
  closing_date?: string
  amount: number
  cycle_accumulated?: number
}
