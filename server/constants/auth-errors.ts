/**
 * Authentication Error Codes and Messages
 * Standardized error responses for authentication operations
 */

export interface AuthError {
    code: string;
    message: string;
    suggestion?: string;
}

export const AuthErrors = {
    // User not found
    USER_NOT_FOUND: {
        code: 'AUTH_001',
        message: 'Tên đăng nhập không tồn tại',
        suggestion: 'Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới'
    },

    // Invalid password
    INVALID_PASSWORD: {
        code: 'AUTH_002',
        message: 'Mật khẩu không chính xác',
        suggestion: 'Vui lòng thử lại hoặc đặt lại mật khẩu'
    },

    // OAuth account (no password)
    OAUTH_ACCOUNT: {
        code: 'AUTH_003',
        message: 'Tài khoản đăng nhập bằng Google',
        suggestion: 'Vui lòng sử dụng nút "Đăng nhập với Google"'
    },

    // Account suspended
    ACCOUNT_SUSPENDED: {
        code: 'AUTH_004',
        message: 'Tài khoản đã bị tạm khóa',
        suggestion: 'Vui lòng liên hệ hỗ trợ để biết thêm chi tiết'
    },

    // Account banned
    ACCOUNT_BANNED: {
        code: 'AUTH_005',
        message: 'Tài khoản đã bị cấm',
        suggestion: 'Vui lòng liên hệ hỗ trợ để biết thêm chi tiết'
    },

    // Account inactive
    ACCOUNT_INACTIVE: {
        code: 'AUTH_006',
        message: 'Tài khoản chưa được kích hoạt',
        suggestion: 'Vui lòng kiểm tra email để kích hoạt tài khoản'
    },

    // Generic login failure
    LOGIN_FAILED: {
        code: 'AUTH_000',
        message: 'Đăng nhập thất bại',
        suggestion: 'Vui lòng thử lại sau'
    },

    // Registration errors
    USERNAME_EXISTS: {
        code: 'REG_001',
        message: 'Tên đăng nhập đã tồn tại',
        suggestion: 'Vui lòng chọn tên đăng nhập khác'
    },

    EMAIL_EXISTS: {
        code: 'REG_002',
        message: 'Email đã được sử dụng',
        suggestion: 'Vui lòng sử dụng email khác hoặc đăng nhập'
    },

    // Password reset errors
    INVALID_RESET_TOKEN: {
        code: 'PWD_001',
        message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
        suggestion: 'Vui lòng yêu cầu link mới'
    },

    // Session errors
    SESSION_EXPIRED: {
        code: 'SES_001',
        message: 'Phiên đăng nhập đã hết hạn',
        suggestion: 'Vui lòng đăng nhập lại'
    },

    UNAUTHORIZED: {
        code: 'SES_002',
        message: 'Bạn cần đăng nhập để tiếp tục',
        suggestion: 'Vui lòng đăng nhập'
    }
} as const;

// Type for error info passed to passport
export type AuthErrorInfo = typeof AuthErrors[keyof typeof AuthErrors];
