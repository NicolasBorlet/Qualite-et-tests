export class LoginPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
      this.page = page;
      this.emailInput = '#email';
      this.passwordInput = '#password';
      this.submitButton = 'button[type="submit"]';
    }

    async goto() {
      await this.page.goto('http://localhost:5173/login');
    }

    async fillCredentials(email, password) {
      await this.page.fill(this.emailInput, email);
      await this.page.fill(this.passwordInput, password);
    }

    async submit() {
      await this.page.click(this.submitButton);
    }

    async isOnDashboard() {
      await this.page.waitForURL(/dashboard/);
    }
  }
