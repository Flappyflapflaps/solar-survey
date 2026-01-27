// Authentication service for client-side auth state

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    // Fetch current user info from API
    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }

        try {
            const response = await fetch('/api/me', {
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return this.currentUser;
            }

            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    // Logout user
    async logout() {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.currentUser = null;
        window.location.href = '/login.html';
    }
}

export const authService = new AuthService();
