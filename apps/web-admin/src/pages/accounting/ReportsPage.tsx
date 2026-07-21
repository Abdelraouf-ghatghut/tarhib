import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Select, Space, Table, Tabs, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { accountingApi } from "../../lib/api";

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface Account {
  id: string;
  code: string;
  label: string;
}

interface TrialBalanceRow {
  accountId: string;
  code: string;
  label: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface LedgerEntry {
  date: string;
  reference: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
}

interface BalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  assets: TrialBalanceRow[];
  liabilities: TrialBalanceRow[];
  equity: TrialBalanceRow[];
}

interface IncomeStatement {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  revenue: TrialBalanceRow[];
  expense: TrialBalanceRow[];
}

const money = (v: number) => v.toFixed(2);

const trialBalanceColumns = (t: (k: string) => string) => [
  { title: t("accountCode"), dataIndex: "code", key: "code" },
  { title: t("accountLabel"), dataIndex: "label", key: "label" },
  { title: t("debit"), dataIndex: "totalDebit", key: "totalDebit", render: money },
  { title: t("credit"), dataIndex: "totalCredit", key: "totalCredit", render: money },
  { title: t("balance"), dataIndex: "balance", key: "balance", render: money },
];

function TrialBalanceTab() {
  const { t } = useTranslation();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const from = range?.[0]?.format("YYYY-MM-DD");
  const to = range?.[1]?.format("YYYY-MM-DD");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["accounting", "trial-balance", from, to],
    queryFn: () => accountingApi.trialBalance(from, to).then((r) => r.data as TrialBalanceRow[]),
  });

  return (
    <div>
      <RangePicker
        style={{ marginBottom: 16 }}
        onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
      />
      <Table
        rowKey="accountId"
        dataSource={rows}
        columns={trialBalanceColumns(t)}
        loading={isLoading}
        pagination={{ pageSize: 30 }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}

function LedgerTab() {
  const { t } = useTranslation();
  const [accountId, setAccountId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const from = range?.[0]?.format("YYYY-MM-DD");
  const to = range?.[1]?.format("YYYY-MM-DD");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => accountingApi.accounts.list().then((r) => r.data as Account[]),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["accounting", "ledger", accountId, from, to],
    queryFn: () =>
      accountingApi.ledger(accountId as string, from, to).then((r) => r.data as LedgerEntry[]),
    enabled: !!accountId,
  });

  const columns = [
    { title: t("entryDate"), dataIndex: "date", key: "date" },
    { title: t("reference"), dataIndex: "reference", key: "reference" },
    { title: t("label"), dataIndex: "label", key: "label" },
    { title: t("debit"), dataIndex: "debit", key: "debit", render: money },
    { title: t("credit"), dataIndex: "credit", key: "credit", render: money },
    { title: t("runningBalance"), dataIndex: "balance", key: "balance", render: money },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          style={{ minWidth: 260 }}
          placeholder={t("selectAccount")}
          showSearch
          optionFilterProp="label"
          value={accountId}
          onChange={setAccountId}
          options={[...accounts]
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((a) => ({ value: a.id, label: `${a.code} — ${a.label}` }))}
        />
        <RangePicker onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
      </Space>
      <Table
        rowKey={(r: LedgerEntry, i?: number) => `${r.reference}-${i}`}
        dataSource={rows}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 30 }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: accountId ? t("noEntries") : t("selectAccountHint") }}
      />
    </div>
  );
}

function BalanceSheetTab() {
  const { t } = useTranslation();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ["accounting", "balance-sheet", asOf.format("YYYY-MM-DD")],
    queryFn: () =>
      accountingApi.balanceSheet(asOf.format("YYYY-MM-DD")).then((r) => r.data as BalanceSheet),
  });

  return (
    <div>
      <DatePicker
        style={{ marginBottom: 16 }}
        value={asOf}
        allowClear={false}
        onChange={(v) => v && setAsOf(v)}
      />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <Title level={5}>
            {t("assets")} — {money(data?.totalAssets ?? 0)}
          </Title>
          <Table
            rowKey="accountId"
            dataSource={data?.assets ?? []}
            columns={trialBalanceColumns(t)}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <Title level={5}>
            {t("liabilities")} — {money(data?.totalLiabilities ?? 0)}
          </Title>
          <Table
            rowKey="accountId"
            dataSource={data?.liabilities ?? []}
            columns={trialBalanceColumns(t)}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
          <Title level={5} style={{ marginTop: 24 }}>
            {t("equity")} — {money(data?.totalEquity ?? 0)}
          </Title>
          <Table
            rowKey="accountId"
            dataSource={data?.equity ?? []}
            columns={trialBalanceColumns(t)}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </div>
      </div>
    </div>
  );
}

function IncomeStatementTab() {
  const { t } = useTranslation();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const from = range?.[0]?.format("YYYY-MM-DD");
  const to = range?.[1]?.format("YYYY-MM-DD");

  const { data, isLoading } = useQuery({
    queryKey: ["accounting", "income-statement", from, to],
    queryFn: () => accountingApi.incomeStatement(from, to).then((r) => r.data as IncomeStatement),
  });

  return (
    <div>
      <RangePicker
        style={{ marginBottom: 16 }}
        onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
      />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <Title level={5}>
            {t("revenue")} — {money(data?.totalRevenue ?? 0)}
          </Title>
          <Table
            rowKey="accountId"
            dataSource={data?.revenue ?? []}
            columns={trialBalanceColumns(t)}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <Title level={5}>
            {t("expense")} — {money(data?.totalExpense ?? 0)}
          </Title>
          <Table
            rowKey="accountId"
            dataSource={data?.expense ?? []}
            columns={trialBalanceColumns(t)}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </div>
      </div>
      <Title level={4} style={{ marginTop: 24 }}>
        {t("netProfit")}: {money(data?.netProfit ?? 0)} {t("currencyUnit")}
      </Title>
    </div>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        {t("accountingReports")}
      </Title>
      <Tabs
        items={[
          { key: "trial-balance", label: t("trialBalance"), children: <TrialBalanceTab /> },
          { key: "ledger", label: t("ledger"), children: <LedgerTab /> },
          { key: "balance-sheet", label: t("balanceSheet"), children: <BalanceSheetTab /> },
          {
            key: "income-statement",
            label: t("incomeStatement"),
            children: <IncomeStatementTab />,
          },
        ]}
      />
    </div>
  );
}

export default ReportsPage;
