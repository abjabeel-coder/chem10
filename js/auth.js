// ─── AUTH MODULE ───────────────────────────────────────────────
// Handles Supabase auth when enabled, falls back to guest mode.

const Auth = (() => {
  let _supabase = null;
  let _user = null; // { id, name, email } or null (guest)

  function init() {
    if (SUPABASE_ENABLED) {
      _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      _supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user) _setUser(data.session.user);
      });
      _supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) _setUser(session.user);
        else { _user = null; _renderNav(); }
      });
    }
    _renderNav();
  }

  function _setUser(supaUser) {
    _user = {
      id: supaUser.id,
      email: supaUser.email,
      name: supaUser.user_metadata?.name || supaUser.email.split('@')[0],
    };
    _renderNav();
  }

  function _renderNav() {
    const navUser = document.getElementById('navUser');
    const authBtn  = document.getElementById('authBtn');
    if (_user) {
      navUser.textContent = _user.name;
      authBtn.textContent = 'Sign Out';
      authBtn.onclick = signOut;
    } else {
      navUser.textContent = '';
      authBtn.textContent = 'Sign In';
      authBtn.onclick = () => openModal();
    }
  }

  async function signIn(email, password) {
    if (!_supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { data };
  }

  async function signUp(email, password, name) {
    if (!_supabase) return { error: 'Supabase not configured.' };
    const { data, error } = await _supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    return { data };
  }

  async function signOut() {
    if (_supabase) await _supabase.auth.signOut();
    _user = null;
    _renderNav();
  }

  function continueAsGuest() {
    _user = null;
    closeModal();
  }

  // ── Save result to Supabase (if logged in) ──
  async function saveResult(result) {
    if (!_supabase || !_user) return;
    await _supabase.from('quiz_results').insert({
      user_id: _user.id,
      score: result.score,
      total: result.total,
      correct: result.correct,
      wrong: result.wrong,
      time_taken: result.timeTaken,
      chapters: result.chapters,
      created_at: new Date().toISOString(),
    });
  }

  // ── Modal wiring ──
  function openModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('authError').style.display = 'none';
  }
  function closeModal() {
    document.getElementById('authModal').style.display = 'none';
  }

  function getUser() { return _user; }
  function getSupabase() { return _supabase; }

  return { init, signIn, signUp, signOut, continueAsGuest, saveResult, openModal, closeModal, getUser, getSupabase };
})();

// ── Wire up modal UI ──
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  const tabSignin  = document.getElementById('tabSignin');
  const tabSignup  = document.getElementById('tabSignup');
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const authError  = document.getElementById('authError');

  function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
  }
  function clearError() { authError.style.display = 'none'; }

  tabSignin.onclick = () => {
    tabSignin.classList.add('active'); tabSignup.classList.remove('active');
    signinForm.style.display = 'flex'; signupForm.style.display = 'none';
    clearError();
  };
  tabSignup.onclick = () => {
    tabSignup.classList.add('active'); tabSignin.classList.remove('active');
    signupForm.style.display = 'flex'; signinForm.style.display = 'none';
    clearError();
  };

  document.getElementById('closeModal').onclick  = Auth.closeModal;
  document.getElementById('guestBtn').onclick     = Auth.continueAsGuest;

  document.getElementById('signinBtn').onclick = async () => {
    clearError();
    const email = document.getElementById('signinEmail').value.trim();
    const pass  = document.getElementById('signinPass').value;
    if (!email || !pass) return showError('Please enter email and password.');
    const btn = document.getElementById('signinBtn');
    btn.textContent = 'Signing in…'; btn.disabled = true;
    const res = await Auth.signIn(email, pass);
    btn.textContent = 'Sign In'; btn.disabled = false;
    if (res.error) return showError(res.error);
    Auth.closeModal();
  };

  document.getElementById('signupBtn').onclick = async () => {
    clearError();
    const name  = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPass').value;
    if (!name || !email || !pass) return showError('Please fill in all fields.');
    if (pass.length < 6) return showError('Password must be at least 6 characters.');
    const btn = document.getElementById('signupBtn');
    btn.textContent = 'Creating…'; btn.disabled = true;
    const res = await Auth.signUp(email, pass, name);
    btn.textContent = 'Create Account'; btn.disabled = false;
    if (res.error) return showError(res.error);
    showError('✅ Check your email to confirm your account, then sign in.');
  };

  // Close overlay on outside click
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('authModal')) Auth.closeModal();
  });
});
