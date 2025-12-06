// XSS koruması - HTML temizleme (DOMPurify yerine native)
export const sanitizeHtml = (html: string): string => {
  if (!html) return "";
  
  // Temel HTML tag'lerini temizle
  const allowedTags = ["b", "i", "em", "strong", "p", "br"];
  const tagRegex = new RegExp(`<(?!\/?(${allowedTags.join("|")})\s*\/?)[^>]+>`, "gi");
  
  return html
    .replace(tagRegex, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
};

// Input doğrulama - zararlı karakterleri temizle
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // HTML taglarını kaldır
    .replace(/[<>]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
      };
      return entities[char] || char;
    })
    .trim()
    .slice(0, 1000); // Max 1000 karakter
};

// SQL injection koruması - sadece alfanumerik ve izin verilen karakterler
export const sanitizeForQuery = (input: string): string => {
  if (!input) return "";
  return input.replace(/[';"\\/]/g, "").trim();
};

// URL doğrulama
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Dosya türü doğrulama
export const isValidImageType = (file: File): boolean => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return allowedTypes.includes(file.type);
};

// Dosya boyutu kontrolü (max 5MB)
export const isValidFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

// E-posta doğrulama
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Telefon numarası doğrulama (Türkiye formatı)
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 12;
};

// Rate limiting için localStorage tabanlı kontrol
export const checkClientRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    localStorage.setItem(storageKey, JSON.stringify({ count: 1, timestamp: now }));
    return true;
  }

  const data = JSON.parse(stored);
  
  if (now - data.timestamp > windowMs) {
    localStorage.setItem(storageKey, JSON.stringify({ count: 1, timestamp: now }));
    return true;
  }

  if (data.count >= maxRequests) {
    return false;
  }

  localStorage.setItem(storageKey, JSON.stringify({ count: data.count + 1, timestamp: data.timestamp }));
  return true;
};

// CSRF token oluşturma
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

// Honeypot alanı kontrolü (bot tespiti)
export const isHoneypotFilled = (value: string): boolean => {
  return value.length > 0;
};
