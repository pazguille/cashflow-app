// OAuth2 Authentication for Google Sheets (usando Google Identity Services)
class GoogleAuthManager {
    constructor() {
        this.CLIENT_ID = config.googleClientId;
        this.accessToken = localStorage.getItem('cashflow_access_token');
        this.tokenExpiry = localStorage.getItem('cashflow_token_expiry');
        this.isInitialized = false;
        this.tokenClient = null; // Para OAuth2 token requests
    }

    async initialize() {
        return new Promise((resolve) => {
            try {
                // Esperar a que google esté disponible
                if (typeof google === 'undefined' || !google.accounts) {
                    console.error('❌ google.accounts no disponible');
                    resolve(false);
                    return;
                }

                // Inicializar Google Identity Services CON SCOPES para OAuth2
                google.accounts.id.initialize({
                    client_id: config.googleClientId,
                    callback: (response) => this._handleCredentialResponse(response),
                    // Scopes para acceder a Google Sheets
                    scope: 'https://www.googleapis.com/auth/spreadsheets'
                });

                // Inicializar Google Accounts también (para TokenClient)
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: config.googleClientId,
                    scope: 'https://www.googleapis.com/auth/spreadsheets',
                    callback: (response) => this._handleTokenResponse(response)
                });

                this.isInitialized = true;
                console.log('✅ Google Identity Services inicializado con scopes OAuth2');
                resolve(true);

            } catch (error) {
                console.error('Error inicializando Google Auth:', error);
                resolve(false);
            }
        });
    }

    _handleCredentialResponse(response) {
        console.log('📝 ID Token recibido (para autenticación)');

        // El primer sign-in devuelve un ID Token
        // Ahora necesitamos obtener el Access Token
        if (this.tokenClient) {
            console.log('🔄 Solicitando Access Token para Sheets...');
            this.tokenClient.requestAccessToken();
        }
    }

    _handleTokenResponse(response) {
        console.log('📝 Access Token recibido (para APIs):', response.access_token?.substring(0, 20) + '...');

        if (response.error !== undefined) {
            console.error('❌ Error obteniendo token:', response.error);
            showToast('Error en autenticación. Intenta de nuevo.', 'error');
            return;
        }

        // Guardar access token
        this.accessToken = response.access_token;
        localStorage.setItem('cashflow_access_token', this.accessToken);

        // Calcular expiry (típicamente 3600 segundos = 1 hora)
        const expiry = new Date();
        expiry.setSeconds(expiry.getSeconds() + (response.expires_in || 3600));
        this.tokenExpiry = expiry.toISOString();
        localStorage.setItem('cashflow_token_expiry', this.tokenExpiry);

        // Extraer email del token (si está disponible)
        try {
            const base64Url = this.accessToken.split('.')[1];
            if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                );
                const decoded = JSON.parse(jsonPayload);
                if (decoded.email) {
                    localStorage.setItem('cashflow_user_email', decoded.email);
                    console.log(`✅ Autenticado como: ${decoded.email}`);
                }
            }
        } catch (e) {
            console.warn('⚠️ No se pudo extraer email del token (es normal con access tokens)');
        }

        showToast(`✅ Autenticado correctamente`, 'success');
        updateAuthUI();
    }

    signIn() {
        // Con GIS, se usa el botón HTML directo
        // Esta función es para compatibilidad
        console.log('signIn() - Usa el botón HTML en su lugar');
    }

    async signOut() {
        try {
            google.accounts.id.disableAutoSelect();

            // Revocar el access token
            if (this.accessToken) {
                fetch('https://oauth2.googleapis.com/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `token=${this.accessToken}`
                }).catch(e => console.warn('Error revocando token:', e));
            }

            localStorage.removeItem('cashflow_access_token');
            localStorage.removeItem('cashflow_token_expiry');
            localStorage.removeItem('cashflow_user_email');

            this.accessToken = null;
            this.tokenExpiry = null;

            showToast('Sesión cerrada', 'info');
            updateAuthUI();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }

    isSignedIn() {
        if (!this.accessToken) return false;

        // Verificar si el token expiró
        if (this.tokenExpiry) {
            const expiry = new Date(this.tokenExpiry);
            if (new Date() > expiry) {
                localStorage.removeItem('cashflow_access_token');
                this.accessToken = null;
                return false;
            }
        }
        return true;
    }

    getAccessToken() {
        return this.accessToken;
    }

    getUserEmail() {
        return localStorage.getItem('cashflow_user_email') || 'Usuario';
    }
}

// Instancia global (instanciada inmediatamente para leer localStorage)
let authManager = new GoogleAuthManager();

async function initializeAuth() {
    console.log('🔄 Inicializando auth (Google SDK)...');
    const initialized = await authManager.initialize();

    console.log('Initialized result:', initialized);

    if (initialized) {
        if (authManager.isSignedIn()) {
            console.log(`✅ OAuth2 inicializado. Usuario: ${authManager.getUserEmail()}`);
        } else {
            console.log('⚠️ OAuth2 inicializado, pero usuario no autenticado - mostrando botón');
        }
        updateAuthUI();

        // Refresh icons after UI update
        if (window.lucide) lucide.createIcons();
    } else {
        console.error('❌ Error inicializando OAuth2');
        // No mostramos toast ya que es esperado si no está configurado aún
    }
}

function updateAuthUI() {
    console.log('🎨 Actualizando UI...');
    const settingsBtn = document.getElementById('settingsBtn');
    const headerActions = document.querySelector('.header-actions');

    if (!headerActions) {
        console.error('❌ No encontré .header-actions');
        return;
    }

    if (authManager && authManager.isSignedIn()) {
        console.log('✅ Usuario autenticado');
        if (settingsBtn) settingsBtn.disabled = false;

        // Quitar botón de Google Sign-In si existe
        const googleSignInContainer = document.getElementById('googleSignInContainer');
        if (googleSignInContainer) googleSignInContainer.remove();

        console.log(`✅ Conectado como: ${authManager.getUserEmail()}`);
    } else {
        console.log('❌ Usuario NO autenticado');
        if (settingsBtn) settingsBtn.disabled = false;

        // Renderizar Google Sign-In Button si no existe
        if (!document.getElementById('googleSignInContainer')) {
            console.log('Creando botón de Google Sign-In');
            const container = document.createElement('div');
            container.id = 'googleSignInContainer';
            container.style.display = 'inline-block';
            headerActions.insertBefore(container, headerActions.firstChild);

            // Renderizar el botón de Google
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                google.accounts.id.renderButton(
                    container,
                    {
                        theme: 'outline',
                        size: 'large',
                        text: 'signin_with'
                    }
                );

                // Agregar click listener para pedir token cuando se autentique
                container.addEventListener('click', () => {
                    console.log('👆 Click en botón, solicitando token...');
                    if (authManager && authManager.tokenClient) {
                        authManager.tokenClient.requestAccessToken({ prompt: 'consent' });
                    }
                });

                console.log('✅ Botón de Google Sign-In renderizado');
            } else {
                console.warn('⚠️ google.accounts no disponible');
            }
        }

        console.log('⚠️ Usuario no autenticado');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM listo');

    // Esperar a que google esté disponible
    const checkGoogle = setInterval(async () => {
        console.log('🔍 Buscando google.accounts...');
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('✅ google.accounts encontrado');
            clearInterval(checkGoogle);
            await initializeAuth();
        }
    }, 300);

    // Timeout de seguridad (máximo 15 segundos esperando)
    setTimeout(() => {
        clearInterval(checkGoogle);
        if (!authManager || !authManager.isInitialized) {
            console.warn('⚠️ google.accounts no cargó después de 15 segundos');
            showToast('Error cargando Google. Recarga la página.', 'error');
            updateAuthUI(); // Mostrar botón de todas formas
        }
    }, 15000);
});
