import { FRONTEND_URL } from '../config/index.js';
import { BillingCycle } from '@prisma/client';
/** Minimal escaping for interpolating user/org text into HTML emails. */
export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
const BRAND = {
    name: process.env.EMAIL_FROM_NAME || 'Quizmon',
    primary: '#0f172a',
    accent: '#2563eb',
    muted: '#64748b',
    border: '#e2e8f0',
    bg: '#f8fafc',
};
/**
 * Table-based HTML suitable for major email clients (limited CSS).
 */
export function enterpriseEmailLayout(opts) {
    const { title, preheader, innerHtml, ctaLabel, ctaUrl, footnote } = opts;
    const pre = preheader ??
        title;
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px 28px;border-bottom:4px solid ${BRAND.accent};">
              <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(BRAND.name)}</p>
              <h1 style="margin:12px 0 0 0;font-size:22px;line-height:1.3;color:${BRAND.primary};">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;font-size:15px;line-height:1.6;color:${BRAND.primary};">
              ${innerHtml}
            </td>
          </tr>
          ${ctaLabel && ctaUrl
        ? `<tr>
            <td style="padding:8px 28px 28px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:8px;background:${BRAND.accent};">
                    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        : ''}
          <tr>
            <td style="padding:0 28px 24px 28px;font-size:12px;line-height:1.5;color:${BRAND.muted};border-top:1px solid ${BRAND.border};">
              <p style="margin:16px 0 8px 0;">
                ${footnote ?? 'Đây là email tự động từ hệ thống Quizmon. Nếu bạn không thực hiện thao tác này, vui lòng liên hệ hỗ trợ ngay.'}
              </p>
              <p style="margin:0;">© ${new Date().getFullYear()} ${escapeHtml(BRAND.name)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
export function passwordChangedEmail(params) {
    const { displayName, changedAt } = params;
    const when = changedAt.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
    const inner = `
      <p style="margin:0 0 16px 0;">Xin chào <strong>${escapeHtml(displayName)}</strong>,</p>
      <p style="margin:0 0 16px 0;">Mật khẩu tài khoản Quizmon của bạn vừa được thay đổi thành công.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;">
        <tr><td style="padding:14px 18px;font-size:14px;">
          <strong>Thời gian:</strong> ${escapeHtml(when)}<br/>
          <strong>Tài khoản:</strong> ${escapeHtml(displayName)}
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;">Nếu bạn không thực hiện thay đổi này, hãy đặt lại mật khẩu ngay và liên hệ đội ngũ hỗ trợ.</p>
    `;
    return {
        subject: `[${BRAND.name}] Xác nhận thay đổi mật khẩu`,
        html: enterpriseEmailLayout({
            title: 'Mật khẩu đã được cập nhật',
            preheader: `Đổi mật khẩu ${when}`,
            innerHtml: inner,
            ctaLabel: 'Đăng nhập Quizmon',
            ctaUrl: `${FRONTEND_URL}/login`,
        }),
    };
}
function formatPeriodEnd(d) {
    return d.toLocaleDateString('vi-VN', { dateStyle: 'long' });
}
export function subscriptionActivatedEmail(params) {
    const cycleLabel = params.billingCycle === BillingCycle.YEARLY ? 'Năm' : 'Tháng';
    const inner = `
      <p style="margin:0 0 16px 0;">Gói đăng ký cho tổ chức <strong>${escapeHtml(params.orgName)}</strong> đã được kích hoạt hoặc gia hạn.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;">
        <tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;">
          <strong>Gói:</strong> ${escapeHtml(params.planName)}<br/>
          <strong>Chu kỳ thanh toán:</strong> ${cycleLabel}<br/>
          <strong>Hết hạn chu kỳ hiện tại:</strong> ${escapeHtml(formatPeriodEnd(params.currentPeriodEnd))}
        </td></tr>
      </table>
      <p style="margin:0;">Bạn có thể xem chi tiết và hóa đơn trong phần quản lý gói dịch vụ.</p>
    `;
    return {
        subject: `[${BRAND.name}] Gói đăng ký đã được kích hoạt`,
        html: enterpriseEmailLayout({
            title: 'Xác nhận gói đăng ký',
            preheader: `${params.planName} · ${params.orgName}`,
            innerHtml: inner,
            ctaLabel: 'Mở trang thanh toán',
            ctaUrl: `${FRONTEND_URL}/billing`,
        }),
    };
}
export function subscriptionCanceledEmail(params) {
    const inner = `
      <p style="margin:0 0 16px 0;">Gói <strong>${escapeHtml(params.planName)}</strong> của tổ chức <strong>${escapeHtml(params.orgName)}</strong> đã được hủy theo yêu cầu.</p>
      <p style="margin:0 0 16px 0;">Quyền lợi của gói hiện tại vẫn có hiệu lực đến <strong>${escapeHtml(formatPeriodEnd(params.accessUntil))}</strong>, trừ khi có thông báo khác từ hệ thống.</p>
      <p style="margin:0;">Bạn có thể đăng ký lại bất cứ lúc nào.</p>
    `;
    return {
        subject: `[${BRAND.name}] Xác nhận hủy gói đăng ký`,
        html: enterpriseEmailLayout({
            title: 'Gói đăng ký đã hủy',
            innerHtml: inner,
            ctaLabel: 'Xem gói dịch vụ',
            ctaUrl: `${FRONTEND_URL}/billing`,
        }),
    };
}
export function homeworkAssignedEmail(params) {
    const inner = `
      <p style="margin:0 0 16px 0;">Xin chào <strong>${escapeHtml(params.studentName)}</strong>,</p>
      <p style="margin:0 0 16px 0;">Giáo viên vừa giao bài tập mới: <strong>${escapeHtml(params.quizTitle)}</strong>.</p>
      <p style="margin:0;">Vào lớp học để làm bài và theo dõi tiến độ.</p>
    `;
    return {
        subject: `[${BRAND.name}] Bài tập mới: ${params.quizTitle}`,
        html: enterpriseEmailLayout({
            title: 'Bài tập mới được giao',
            preheader: params.quizTitle,
            innerHtml: inner,
            ctaLabel: 'Mở lớp học',
            ctaUrl: params.classroomUrl,
        }),
    };
}
