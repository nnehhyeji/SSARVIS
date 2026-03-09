export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-green-600 mb-4">🔑 로그인 페이지</h1>
            <p className="text-gray-600 mb-6">여기는 로그인을 하는 화면입니다.</p>
            <button className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
                가짜 로그인 버튼
            </button>
        </div>
    );
}
