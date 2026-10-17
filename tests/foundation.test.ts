import assert from 'assert';
import { foundationStore } from '../src/server/foundationStore';
import { verifyPassword, hashPassword, generateSalt, sanitizeForLogAndApi } from '../src/server/cryptoVault';

console.log('--- شروع آزمون‌های پایه مرحله ۱: Foundation ---');

// 1. Test Password Hashing and Salt Verification
console.log('1. تست رمزنگاری پسورد و Salt...');
const salt = generateSalt();
const hash = hashPassword('admin', salt);
assert.strictEqual(verifyPassword('admin', salt, hash), true, 'کلمه عبور admin باید تایید شود.');
assert.strictEqual(verifyPassword('wrong_pass', salt, hash), false, 'کلمه عبور اشتباه باید رد شود.');
console.log('   ✅ آزمون رمزنگاری و Salt با موفقیت تایید شد.');

// 2. Test Initial Admin Authentication ('admin' / 'admin')
console.log('2. تست احراز هویت ادمین پیش‌فرض (admin / admin)...');
const adminUser = foundationStore.authenticateUser('admin', 'admin');
assert.strictEqual(adminUser.username, 'admin', 'نام کاربری باید admin باشد.');
assert.strictEqual(adminUser.status, 'ACTIVE', 'وضعیت کاربر باید ACTIVE باشد.');

assert.throws(
  () => {
    foundationStore.authenticateUser('admin', 'wrong_password_test');
  },
  /نام کاربری یا کلمه عبور وارد شده نادرست است/,
  'ورود با رمز عبور اشتباه باید متوقف شود.'
);
console.log('   ✅ احراز هویت مستقیم با دیتابیس (admin / admin) با موفقیت تایید شد.');

// 3. Test RBAC Engine Precedence Rule:
// Explicit Deny > Explicit Grant > Role Permission > Default Deny
console.log('3. تست موتور مجوز RBAC و قاعده Explicit Deny > Explicit Grant > Role Permission > Default Deny...');

// 3a. Role Permission: Admin (OWNER) has foundation.users.manage in role_permissions
const evalRolePerm = foundationStore.evaluatePermission(adminUser.id, 'foundation.users.manage');
assert.strictEqual(evalRolePerm.allowed, true);
assert.strictEqual(evalRolePerm.matchedRule, 'ROLE_PERMISSION');

// 3b. Explicit Deny overrides Role Permission (even for admin!)
foundationStore.setPermissionOverride({
  targetUserId: adminUser.id,
  permissionCode: 'foundation.users.manage',
  effect: 'DENY',
  reasonFa: 'تست منع صریح دسترسی',
});

const evalExplicitDeny = foundationStore.evaluatePermission(adminUser.id, 'foundation.users.manage');
assert.strictEqual(evalExplicitDeny.allowed, false, 'منع صریح باید دسترسی نقش را باطل کند.');
assert.strictEqual(evalExplicitDeny.matchedRule, 'EXPLICIT_DENY');

// Clean up explicit deny
foundationStore.setPermissionOverride({
  targetUserId: adminUser.id,
  permissionCode: 'foundation.users.manage',
  effect: 'REMOVE',
  reasonFa: 'پاک‌سازی تست',
});

// 3c. Explicit Grant overrides missing role permission
// Create a temporary user with no roles
const tempUser = foundationStore.createUser({
  username: `temp_test_${Date.now()}`,
  fullName: 'کاربر تستی آزمون',
  jobTitle: 'کارشناس تستی',
  password: 'temp_password',
  roleCodes: [],
});

const evalDefaultDeny = foundationStore.evaluatePermission(tempUser.id, 'foundation.audit.read');
assert.strictEqual(evalDefaultDeny.allowed, false);
assert.strictEqual(evalDefaultDeny.matchedRule, 'DEFAULT_DENY');

foundationStore.setPermissionOverride({
  targetUserId: tempUser.id,
  permissionCode: 'foundation.audit.read',
  effect: 'ALLOW',
  reasonFa: 'اعطای موردی صریح',
});

const evalExplicitGrant = foundationStore.evaluatePermission(tempUser.id, 'foundation.audit.read');
assert.strictEqual(evalExplicitGrant.allowed, true, 'اعطای صریح باید دسترسی بدهد.');
assert.strictEqual(evalExplicitGrant.matchedRule, 'EXPLICIT_GRANT');

console.log('   ✅ آزمون ترتیب اولویت موتور RBAC با موفقیت تایید شد.');

// 4. Test Audit Log Redaction (Zero Secret Leaks)
console.log('4. تست پالایش لاگ و عدم افشای رمز عبور در Audit Log...');
const sanitized = sanitizeForLogAndApi({
  username: 'admin',
  password: 'plaintext_password_that_must_not_appear',
  token: 'secret_token_123',
  normalField: 'مجاز',
});
assert.strictEqual((sanitized as any).password, '[REDACTED_BY_SECURITY_POLICY]');
assert.strictEqual((sanitized as any).token, '[REDACTED_BY_SECURITY_POLICY]');
assert.strictEqual((sanitized as any).normalField, 'مجاز');
console.log('   ✅ آزمون امنیت لاگ و عدم افشای اطلاعات حساس با موفقیت تایید شد.');

console.log('--- تمام آزمون‌های پایه Foundation با موفقیت ۱۰۰٪ پاس شدند! ---');
