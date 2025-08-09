// File: auth/jwt.go
package auth

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Blacklist để lưu trữ các token đã logout
var (
	tokenBlacklist = make(map[string]int64)
	blacklistMutex sync.RWMutex
)

// Tạo JWT secret ngẫu nhiên mỗi lần khởi động server
func generateRandomSecret() []byte {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return bytes
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Tạo secret ngẫu nhiên nếu không có trong env
		secret = hex.EncodeToString(generateRandomSecret())
	}
	return []byte(secret)
}

var jwtSecret = getJWTSecret()

// Access token (hạn 15 phút)
func GenerateAccessToken(userID uint, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(15 * time.Minute).Unix(), // Tăng lên 15 phút
		"iat":     time.Now().Unix(),                       // Issued at
		"jti":     generateTokenID(),                       // JWT ID để track
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// Refresh token (hạn 7 ngày)
func GenerateRefreshToken(userID uint, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
		"jti":     generateTokenID(),
		"type":    "refresh", // Đánh dấu đây là refresh token
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// Tạo token ID ngẫu nhiên
func generateTokenID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Verify token
func ParseToken(tokenStr string) (jwt.MapClaims, error) {
	// Kiểm tra blacklist trước
	blacklistMutex.RLock()
	if _, exists := tokenBlacklist[tokenStr]; exists {
		blacklistMutex.RUnlock()
		return nil, jwt.ErrTokenExpired
	}
	blacklistMutex.RUnlock()

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// Kiểm tra signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return token.Claims.(jwt.MapClaims), nil
}

// Thêm token vào blacklist khi logout
func BlacklistToken(tokenStr string) {
	blacklistMutex.Lock()
	defer blacklistMutex.Unlock()
	tokenBlacklist[tokenStr] = time.Now().Unix()
}

// Dọn dẹp blacklist định kỳ (có thể gọi mỗi giờ)
func CleanupBlacklist() {
	blacklistMutex.Lock()
	defer blacklistMutex.Unlock()

	currentTime := time.Now().Unix()
	for token, timestamp := range tokenBlacklist {
		// Xóa tokens cũ hơn 24 giờ
		if currentTime-timestamp > 24*3600 {
			delete(tokenBlacklist, token)
		}
	}
}

// Kiểm tra token có trong blacklist không
func IsTokenBlacklisted(tokenStr string) bool {
	blacklistMutex.RLock()
	defer blacklistMutex.RUnlock()
	_, exists := tokenBlacklist[tokenStr]
	return exists
}
