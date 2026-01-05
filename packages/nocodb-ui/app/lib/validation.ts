/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 * 密码需要至少 8 个字符，包含大小写字母和数字
 */
export function validatePassword(password: string): { valid: boolean; error: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "密码至少需要 8 个字符" };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "密码需要包含小写字母" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "密码需要包含大写字母" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "密码需要包含数字" };
  }
  
  return { valid: true, error: "" };
}

/**
 * 验证 URL 格式
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
