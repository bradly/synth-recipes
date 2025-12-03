const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const lightSwitch = document.getElementById('light-switch');

function applyTheme(isDark) {
  document.body.classList.remove('dark', 'light');
  if (isDark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.add('light');
  }
}

applyTheme(prefersDark.matches);

prefersDark.addEventListener('change', function(e) {
  applyTheme(e.matches);
});

lightSwitch.addEventListener('click', function() {
  const isDark = document.body.classList.contains('dark');
  applyTheme(!isDark);
});
