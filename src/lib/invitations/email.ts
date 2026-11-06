import { type InvitationPermissions } from "./permissions";

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
export function invitationEmail(input: {
  project: string; inviter: string; message: string; url: string; permissions: InvitationPermissions;
}) {
  const e = escapeEmailHtml;
  const brandIconUrl = (() => {
    try {
      return new URL("/Favicon/icon-48.png", input.url).toString();
    } catch {
      return "/Favicon/icon-48.png";
    }
  })();
  const subject = `Du er invitert til ${input.project}`.replace(/[\r\n]/g, " ");
  const text = `WrapUp Desk\n\n${input.inviter} inviterer deg til ${input.project}.\n\n${input.message}\nSe invitasjonen: ${input.url}\n\nLenken er personlig og gyldig i 7 dager. Opprett konto eller logg inn med kontoen din. Hvis du ikke forventet invitasjonen, kan du se bort fra denne e-posten.`;
  // Inline styles, explicit table widths and bgcolor keep the layout usable in email clients.
  const html = `<!doctype html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${e(subject)}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table{border-collapse:collapse} @media only screen and (max-width:600px){.email-outer{padding:16px 8px!important}.email-content{padding:28px 20px!important}.email-title{font-size:30px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f7f4ed;color:#17150f;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(input.inviter)} inviterer deg til ${e(input.project)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f4ed"><tr><td class="email-outer" align="center" style="padding:40px 16px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffdf8" style="width:100%;max-width:600px;border:1px solid #ded8c9;background-color:#fffdf8">
<tr><td height="4" bgcolor="#7a2e2a" style="height:4px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="email-content" style="padding:36px 40px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="28" style="width:28px;padding:0 10px 0 0"><img src="${e(brandIconUrl)}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none"></td>
<td style="font-size:27px;line-height:32px;letter-spacing:-1.2px;font-weight:500;color:#17150f">wrapup</td>
<td style="padding:0 9px;color:#ded8c9;font-size:25px;font-weight:400">|</td>
<td style="font-size:27px;line-height:32px;letter-spacing:-1.2px;font-weight:500;color:#7a2e2a">desk</td>
<td valign="bottom" style="padding:0 0 6px 9px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="3" height="3" bgcolor="#c4bca8"></td><td width="3"></td><td width="3" bgcolor="#9a9484"></td><td width="3"></td><td width="3" bgcolor="#5c574a"></td><td width="3"></td><td width="7" height="7" bgcolor="#7a2e2a"></td></tr></table></td>
</tr></table>
<p style="margin:36px 0 12px;font-family:'Courier New',monospace;font-size:10px;line-height:16px;letter-spacing:1.8px;color:#7a2e2a">PROSJEKTINVITASJON</p>
<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#5c574a"><strong style="color:#17150f;font-weight:600">${e(input.inviter)}</strong> inviterer deg til å samarbeide i WrapUp Desk.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1e8" style="border-left:3px solid #7a2e2a"><tr><td style="padding:20px 22px"><p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:1.4px;color:#5c574a">DITT PROSJEKT</p><h2 style="margin:0 0 8px;font-size:22px;line-height:28px;font-weight:500;letter-spacing:-0.5px;overflow-wrap:anywhere">${e(input.project)}</h2></td></tr></table>
${input.message ? `<p style="margin:24px 0;font-size:14px;line-height:23px;color:#17150f;overflow-wrap:anywhere">${e(input.message).replace(/\r?\n/g, "<br>")}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td align="center" bgcolor="#17150f"><a href="${e(input.url)}" style="display:block;padding:17px 20px;border:1px solid #17150f;font-size:14px;line-height:20px;font-weight:500;color:#f7f4ed;text-decoration:none;text-align:center;mso-padding-alt:0"><!--[if mso]><i style="mso-font-width:100%;mso-text-raise:20pt">&nbsp;</i><![endif]-->Se invitasjonen &nbsp;→<!--[if mso]><i style="mso-font-width:100%">&nbsp;</i><![endif]--></a></td></tr></table>
<p style="margin:16px 0 0;font-size:12px;line-height:19px;color:#5c574a">Opprett konto, eller logg inn hvis du allerede bruker WrapUp Desk. Den personlige lenken er gyldig i 7 dager.</p>
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #ded8c9;font-size:11px;line-height:18px;color:#8a8474">Hvis du ikke forventet denne e-posten, kan du se bort fra den.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="margin:18px 0 0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;color:#8a8474">WRAPUP / DESK</p>
</td></tr></table></body></html>`;
  return { subject, html, text };
}
