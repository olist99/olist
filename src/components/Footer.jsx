export default function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'OCMS';
  return (
    <footer className="site-footer">
      <div className="text">
        <strong>{siteName}</strong> &copy; {new Date().getFullYear()}. All rights reserved.<br />
        This website is not owned or operated by Sulake corporation and is not part of Habbo Hotel &reg;<br />
        <a href="/register">Create an account</a> right now to access various tools or <a href="/login">log in</a><br />
        Powered by <a href="/about" style={{ color: 'inherit', textDecoration: 'underline' }}><strong>OCMS</strong></a> & Arcturus Morningstar
      </div>
    </footer>
  );
}
