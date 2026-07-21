import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Space, Select, Tag, Typography, message, Grid } from "antd";
import { PlusOutlined, EyeOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  procurementApi,
  productsAdminApi,
  suppliersApi,
  companiesApi,
  branchesApi,
  employeesApi,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { useEntityLookup } from "../../hooks/useEntityLookup";
import { exportToCsv } from "../../lib/exportCsv";
import { PoDetailModal } from "./PoDetailModal";
import { PoRejectModal } from "./PoRejectModal";
import { PoReceiveModal } from "./PoReceiveModal";
import { PoCreateModal } from "./PoCreateModal";
import {
  ALL_STATUSES,
  STATUS_COLOR,
  type Employee,
  type NamedEntity,
  type Po,
  type PoStatus,
  type Product,
  type Supplier,
} from "./types";

const { Title } = Typography;

export default function ProcurementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<Po | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [refreshingPoDetail, setRefreshingPoDetail] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PoStatus | undefined>();
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>();
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>();

  // Les achats sont des achats Tarhib (pas ceux d'une société cliente) —
  // livrés à un lieu (société + branche) choisi par commande, jamais filtrés
  // par la société actuellement sélectionnée dans la barre de navigation.
  // Le filtre lieu de livraison ci-dessous est local à cette page.
  const { data: orders = [], isLoading } = useQuery<Po[]>({
    queryKey: ["procurement", statusFilter, filterCompanyId, filterBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (filterCompanyId) params.companyId = filterCompanyId;
      if (filterBranchId) params.branchId = filterBranchId;
      const res = await procurementApi.list(params);
      return res.data as Po[];
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const res = await productsAdminApi.list();
      return res.data as Product[];
    },
  });
  // Un bon de commande n'a de sens que pour un produit acheté aux
  // fournisseurs (isPurchased) — un produit composé (ex. "café sucré") n'a
  // rien à réceptionner, seuls ses ingrédients le sont. `products` (non
  // filtré) reste utilisé pour la résolution des noms sur les BdC déjà créés
  // (PoDetailModal/PoReceiveModal), où un ancien produit doit rester lisible
  // même si son flag a changé depuis.
  const purchasableProducts = products.filter((p) => p.isPurchased);

  // Fournisseurs : ressource Tarhib globale, non liée à une société cliente.
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await suppliersApi.list();
      return res.data as Supplier[];
    },
  });

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: allBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });

  // Branches proposées par le filtre lieu de livraison — limitées à la
  // société choisie dans ce même filtre.
  const { data: filterBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", filterCompanyId],
    queryFn: () => branchesApi.list(filterCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!filterCompanyId,
  });

  const createPo = useMutation({
    mutationFn: (v: Record<string, unknown>) => procurementApi.create(v),
    onSuccess: () => {
      message.success(t("poCreated"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setCreateOpen(false);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const submitPo = useMutation({
    mutationFn: (id: string) => procurementApi.submit(id),
    onSuccess: () => {
      message.success(t("poSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const validatePo = useMutation({
    mutationFn: (id: string) => procurementApi.validate(id),
    onSuccess: () => {
      message.success(t("poValidated"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const rejectPo = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementApi.reject(id, reason),
    onSuccess: () => {
      message.success(t("poRejected"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setRejectOpen(false);
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const sendPo = useMutation({
    mutationFn: (id: string) => procurementApi.send(id),
    onSuccess: () => {
      message.success(t("poSent"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const cancelPo = useMutation({
    mutationFn: (id: string) => procurementApi.cancel(id),
    onSuccess: () => {
      message.success(t("poCancelled"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const receivePo = useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: { lineId: string; receivedQty: number }[] }) =>
      procurementApi.receive(id, { lines }),
    onSuccess: () => {
      message.success(t("poReceived"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setReceiveOpen(false);
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  // createdBy/validatedBy/sentBy/receivedBy/cancelledBy/rejectedBy portent
  // l'identité Keycloak de l'appelant (JwtPayload.sub), pas employees.id.
  const employeeName = useEntityLookup(
    employees,
    (e) => e.keycloakId,
    (e) =>
      isRtl
        ? `${e.firstNameAr} ${e.lastNameAr}`.trim()
        : `${e.firstNameEn} ${e.lastNameEn}`.trim() || e.email,
  );

  const getProductName = useEntityLookup(
    products,
    (p) => p.id,
    (p) => bilingualName(p.nameAr, p.nameEn, isRtl),
  );

  const getSupplierName = useEntityLookup(
    suppliers,
    (s) => s.id,
    (s) => bilingualName(s.nameAr, s.nameEn, isRtl),
  );

  const getCompanyName = useEntityLookup(
    companies,
    (c) => c.id,
    (c) => bilingualName(c.nameAr, c.nameEn, isRtl),
  );

  const getBranchName = useEntityLookup(
    allBranches,
    (b) => b.id,
    (b) => bilingualName(b.nameAr, b.nameEn, isRtl),
  );

  async function handleOpenReceive() {
    if (!detailPo) return;
    // Re-fetch avant d'ouvrir : les quantités déjà reçues ont pu changer si
    // un autre admin a réceptionné entre-temps.
    setRefreshingPoDetail(true);
    try {
      const fresh = (await procurementApi.one(detailPo.id)).data as Po;
      setDetailPo(fresh);
      setReceiveOpen(true);
    } catch (err) {
      message.error(getErrorMessage(err, t));
    } finally {
      setRefreshingPoDetail(false);
    }
  }

  const columns = [
    {
      title: t("supplier"),
      dataIndex: "supplierId",
      key: "supplierId",
      render: (id: string) => getSupplierName(id),
    },
    {
      title: t("deliveryLocation"),
      key: "deliveryLocation",
      render: (_: unknown, r: Po) =>
        `${getCompanyName(r.companyId)} — ${getBranchName(r.branchId)}`,
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (s: PoStatus) => <Tag color={STATUS_COLOR[s]}>{t(`poStatus_${s}`)}</Tag>,
    },
    {
      title: t("lines"),
      key: "lines",
      render: (_: unknown, r: Po) => r.lines.length,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleDateString(isRtl ? "ar" : "en-GB"),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, r: Po) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailPo(r)}>
            {t("view")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("procurement")}
        </Title>
        <Space wrap>
          <Select
            allowClear
            placeholder={t("company")}
            style={{ width: 180 }}
            value={filterCompanyId}
            onChange={(v: string | undefined) => {
              setFilterCompanyId(v);
              setFilterBranchId(undefined);
            }}
            options={companies.map((c) => ({
              value: c.id,
              label: bilingualName(c.nameAr, c.nameEn, isRtl),
            }))}
          />
          <Select
            allowClear
            disabled={!filterCompanyId}
            placeholder={t("branch")}
            style={{ width: 180 }}
            value={filterBranchId}
            onChange={(v: string | undefined) => setFilterBranchId(v)}
            options={filterBranches.map((b) => ({
              value: b.id,
              label: bilingualName(b.nameAr, b.nameEn, isRtl),
            }))}
          />
          <Select
            allowClear
            placeholder={t("filterByStatus")}
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as PoStatus | undefined)}
            options={ALL_STATUSES.map((s) => ({
              value: s,
              label: t(`poStatus_${s}`),
            }))}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportToCsv(`procurement-${dayjs().format("YYYY-MM-DD")}`, orders, [
                { label: "ID", value: (o) => o.id },
                { label: t("status"), value: (o) => t(`poStatus_${o.status}`) },
                { label: t("supplier"), value: (o) => getSupplierName(o.supplierId) },
                { label: t("company"), value: (o) => getCompanyName(o.companyId) },
                { label: t("branch"), value: (o) => getBranchName(o.branchId) },
                {
                  label: t("createdAt"),
                  value: (o) => dayjs(o.createdAt).format("YYYY-MM-DD HH:mm"),
                },
              ])
            }
          >
            {t("exportCsv")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("newPo")}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={orders}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <PoDetailModal
        detailPo={detailPo}
        onClose={() => setDetailPo(null)}
        isMobile={isMobile}
        isRtl={isRtl}
        getSupplierName={getSupplierName}
        getCompanyName={getCompanyName}
        getBranchName={getBranchName}
        getProductName={getProductName}
        employeeName={employeeName}
        submitPo={submitPo}
        validatePo={validatePo}
        sendPo={sendPo}
        cancelPo={cancelPo}
        onOpenReject={() => setRejectOpen(true)}
        onOpenReceive={() => void handleOpenReceive()}
        receiveLoading={refreshingPoDetail}
      />

      <PoRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        detailPo={detailPo}
        rejectPo={rejectPo}
      />

      <PoReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        detailPo={detailPo}
        products={products}
        getProductName={getProductName}
        receivePo={receivePo}
      />

      <PoCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        isRtl={isRtl}
        companies={companies}
        products={purchasableProducts}
        suppliers={suppliers}
        createPo={createPo}
      />
    </div>
  );
}
