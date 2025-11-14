export const ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'ใบงานใหม่' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'open', label: 'รออะไหล่ / รอสินค้า' },
  { value: 'ready', label: 'เสร็จแล้ว (รอชำระ)' },
  { value: 'closed', label: 'ชำระแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

const STATUS_LABEL_MAP = ORDER_STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

export const getOrderStatusLabel = (status) => {
  if (!status) return ''
  return STATUS_LABEL_MAP[status] || status
}
