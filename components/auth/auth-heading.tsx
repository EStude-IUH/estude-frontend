import Link from 'next/link';

export function AuthHeading({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  return (
    <div className="mb-8">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-600">
        {isLogin ? 'Chào mừng trở lại' : 'Bắt đầu cùng EStude'}
      </p>
      <h2 className="text-balance text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-[38px]">
        {isLogin ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
      </h2>
      <p className="mt-3 leading-6 text-slate-500">
        {isLogin
          ? 'Tiếp tục hành trình học tập của bạn.'
          : 'Chỉ mất một phút để tạo không gian học tập riêng.'}
      </p>

      <div
        className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1.5"
        aria-label="Chọn biểu mẫu xác thực"
      >
        <Link
          href="/login"
          className={`rounded-lg px-4 py-2.5 text-center text-sm font-bold transition ${
            isLogin
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-current={isLogin ? 'page' : undefined}
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className={`rounded-lg px-4 py-2.5 text-center text-sm font-bold transition ${
            !isLogin
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-current={!isLogin ? 'page' : undefined}
        >
          Đăng ký
        </Link>
      </div>
    </div>
  );
}
