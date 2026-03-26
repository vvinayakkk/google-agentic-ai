export const formatNumber = (value) => {
  const num = Number(value || 0);
  return Number.isNaN(num) ? "0" : new Intl.NumberFormat("en-IN").format(num);
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const currency = (value, currencyCode = "INR") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(num);
};

export const relativeTime = (value) => {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const toCSV = (rows = [], fields = null) => {
  if (!rows.length) return "";
  const headers = fields || Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers
      .map((key) => {
        const value = row?.[key];
        const str = value === undefined || value === null ? "" : String(value);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",");
    lines.push(line);
  });
  return lines.join("\n");
};

export const downloadFile = (content, fileName, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

