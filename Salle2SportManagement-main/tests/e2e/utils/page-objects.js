/**
 * Page Objects pour les tests E2E Playwright
 * Centralise les sélecteurs et actions des pages principales
 */

export class LoginPage {
  constructor(page) {
    this.page = page;

    // Sélecteurs
    this.userSelect = '[data-testid="user-select"]';
    this.loginButton = '[data-testid="login-button"]';
    this.errorMessage = '[data-testid="error-message"]';
    this.loadingIndicator = '[data-testid="loading"]';
    this.pageTitle = 'h2:has-text("Connexion")';

    // Sélecteurs avancés
    this.userOption = (email) => `option[value="${email}"]`;
    this.loginForm = '.login-form';
  }

  async navigate() {
    await this.page.goto('/login');
    await this.page.waitForSelector(this.pageTitle);
  }

  async selectUser(email) {
    await this.page.selectOption(this.userSelect, email);
  }

  async clickLogin() {
    await this.page.click(this.loginButton);
  }

  async login(email) {
    await this.selectUser(email);
    await this.clickLogin();

    // Attendre soit la redirection, soit l'erreur
    await Promise.race([
      this.page.waitForURL('/dashboard'),
      this.page.waitForSelector(this.errorMessage)
    ]);
  }

  async getErrorMessage() {
    const errorElement = this.page.locator(this.errorMessage);
    return await errorElement.isVisible() ? await errorElement.textContent() : null;
  }

  async isLoading() {
    return await this.page.locator(this.loadingIndicator).isVisible();
  }

  async waitForUserOptions() {
    await this.page.waitForSelector(`${this.userSelect} option:nth-child(2)`);
  }
}

export class DashboardPage {
  constructor(page) {
    this.page = page;

    // Sélecteurs principaux
    this.pageTitle = '[data-testid="page-title"]';
    this.userInfo = '[data-testid="user-info"]';
    this.dashboardStats = '[data-testid="dashboard-stats"]';
    this.subscriptionInfo = '[data-testid="subscription-info"]';
    this.availableClasses = '[data-testid="available-classes"]';
    this.userBookings = '[data-testid="user-bookings"]';
    this.logoutButton = '[data-testid="logout-button"]';
    this.refreshButton = '[data-testid="refresh-button"]';
    this.errorMessage = '[data-testid="error-message"]';
    this.loadingIndicator = '[data-testid="loading"]';

    // Sélecteurs de statistiques
    this.totalBookings = '[data-testid="total-bookings"]';
    this.confirmedBookings = '[data-testid="confirmed-bookings"]';
    this.noShowRate = '[data-testid="noshow-rate"]';

    // Sélecteurs d'abonnement
    this.planType = '[data-testid="plan-type"]';
    this.subscriptionStatus = '[data-testid="subscription-status"]';
    this.noSubscription = '[data-testid="no-subscription"]';
    this.subscribeButton = '[data-testid="subscribe-button"]';

    // Sélecteurs de cours et réservations
    this.noClasses = '[data-testid="no-classes"]';
    this.noBookings = '[data-testid="no-bookings"]';
  }

  async navigate() {
    await this.page.goto('/dashboard');
    await this.page.waitForSelector(this.pageTitle);
  }

  async waitForLoad() {
    await this.page.waitForSelector(this.pageTitle);
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="loading"]');
      return !loading || !loading.offsetParent;
    });
  }

  async getUserInfo() {
    const userElement = this.page.locator(this.userInfo);
    return await userElement.textContent();
  }

  async getStats() {
    await this.page.waitForSelector(this.dashboardStats);
    return {
      totalBookings: await this.page.locator(this.totalBookings).textContent(),
      confirmedBookings: await this.page.locator(this.confirmedBookings).textContent(),
      noShowRate: await this.page.locator(this.noShowRate).textContent()
    };
  }

  async getSubscriptionInfo() {
    const hasSubscription = await this.page.locator(this.planType).isVisible();

    if (hasSubscription) {
      return {
        planType: await this.page.locator(this.planType).textContent(),
        status: await this.page.locator(this.subscriptionStatus).textContent(),
        active: true
      };
    } else {
      return {
        active: false,
        noSubscriptionVisible: await this.page.locator(this.noSubscription).isVisible()
      };
    }
  }

  async getAvailableClasses() {
    const classElements = await this.page.locator('[data-testid^="class-"]').all();
    const classes = [];

    for (const classElement of classElements) {
      const classId = await classElement.getAttribute('data-testid');
      const title = await classElement.locator('h3').textContent();
      const coach = await classElement.locator('.coach').textContent();
      const capacity = await classElement.locator('.capacity').textContent();

      classes.push({
        id: classId.replace('class-', ''),
        title,
        coach,
        capacity
      });
    }

    return classes;
  }

  async bookClass(classId) {
    const bookButton = `[data-testid="book-${classId}"]`;
    await this.page.click(bookButton);

    // Attendre la mise à jour (nouvelle requête)
    await this.page.waitForTimeout(1000);
  }

  async getUserBookings() {
    const bookingElements = await this.page.locator('[data-testid^="booking-"]').all();
    const bookings = [];

    for (const bookingElement of bookingElements) {
      const bookingId = await bookingElement.getAttribute('data-testid');
      const title = await bookingElement.locator('h4').textContent();
      const status = await bookingElement.locator('.status').textContent();

      const cancelButton = bookingElement.locator(`[data-testid^="cancel-"]`);
      const canCancel = await cancelButton.isVisible();

      bookings.push({
        id: bookingId.replace('booking-', ''),
        title,
        status,
        canCancel
      });
    }

    return bookings;
  }

  async cancelBooking(bookingId) {
    const cancelButton = `[data-testid="cancel-${bookingId}"]`;
    await this.page.click(cancelButton);

    // Attendre la mise à jour
    await this.page.waitForTimeout(1000);
  }

  async refresh() {
    await this.page.click(this.refreshButton);
    await this.waitForLoad();
  }

  async logout() {
    await this.page.click(this.logoutButton);
    await this.page.waitForURL('/login');
  }

  async hasError() {
    return await this.page.locator(this.errorMessage).isVisible();
  }

  async getErrorMessage() {
    const errorElement = this.page.locator(this.errorMessage);
    return await errorElement.isVisible() ? await errorElement.textContent() : null;
  }

  async isLoading() {
    return await this.page.locator(this.loadingIndicator).isVisible();
  }
}

export class AdminPage {
  constructor(page) {
    this.page = page;

    // Sélecteurs de navigation admin
    this.adminMenu = '[data-testid="admin-menu"]';
    this.classManagementLink = '[data-testid="class-management-link"]';
    this.userManagementLink = '[data-testid="user-management-link"]';
    this.dashboardLink = '[data-testid="dashboard-link"]';

    // Sélecteurs de gestion des cours
    this.createClassButton = '[data-testid="create-class-button"]';
    this.classForm = '[data-testid="class-form"]';
    this.classTitle = '[data-testid="class-title-input"]';
    this.classCoach = '[data-testid="class-coach-input"]';
    this.classDatetime = '[data-testid="class-datetime-input"]';
    this.classDuration = '[data-testid="class-duration-input"]';
    this.classCapacity = '[data-testid="class-capacity-input"]';
    this.classDescription = '[data-testid="class-description-input"]';
    this.saveClassButton = '[data-testid="save-class-button"]';
    this.cancelClassFormButton = '[data-testid="cancel-class-form-button"]';

    // Sélecteurs de liste des cours
    this.classesTable = '[data-testid="classes-table"]';
    this.editClassButton = (classId) => `[data-testid="edit-class-${classId}"]`;
    this.deleteClassButton = (classId) => `[data-testid="delete-class-${classId}"]`;
    this.cancelClassButton = (classId) => `[data-testid="cancel-class-${classId}"]`;

    // Sélecteurs de confirmation
    this.confirmDialog = '[data-testid="confirm-dialog"]';
    this.confirmButton = '[data-testid="confirm-button"]';
    this.cancelButton = '[data-testid="cancel-button"]';

    // Messages et notifications
    this.successMessage = '[data-testid="success-message"]';
    this.errorMessage = '[data-testid="error-message"]';
    this.validationErrors = '[data-testid="validation-errors"]';
  }

  async navigate() {
    await this.page.goto('/admin');
    await this.page.waitForSelector(this.adminMenu);
  }

  async navigateToClassManagement() {
    await this.page.click(this.classManagementLink);
    await this.page.waitForSelector(this.classesTable);
  }

  async openCreateClassForm() {
    await this.page.click(this.createClassButton);
    await this.page.waitForSelector(this.classForm);
  }

  async fillClassForm(classData) {
    await this.page.fill(this.classTitle, classData.title);
    await this.page.fill(this.classCoach, classData.coach);
    await this.page.fill(this.classDatetime, classData.datetime);

    if (classData.duration) {
      await this.page.fill(this.classDuration, classData.duration.toString());
    }

    await this.page.fill(this.classCapacity, classData.capacity.toString());

    if (classData.description) {
      await this.page.fill(this.classDescription, classData.description);
    }
  }

  async saveClass() {
    await this.page.click(this.saveClassButton);

    // Attendre soit le succès, soit l'erreur
    await Promise.race([
      this.page.waitForSelector(this.successMessage),
      this.page.waitForSelector(this.validationErrors)
    ]);
  }

  async createClass(classData) {
    await this.openCreateClassForm();
    await this.fillClassForm(classData);
    await this.saveClass();
  }

  async editClass(classId, updateData) {
    await this.page.click(this.editClassButton(classId));
    await this.page.waitForSelector(this.classForm);

    // Remplir seulement les champs à modifier
    for (const [field, value] of Object.entries(updateData)) {
      const selector = this[`class${field.charAt(0).toUpperCase() + field.slice(1)}`];
      if (selector) {
        await this.page.fill(selector, value.toString());
      }
    }

    await this.saveClass();
  }

  async deleteClass(classId) {
    await this.page.click(this.deleteClassButton(classId));
    await this.page.waitForSelector(this.confirmDialog);
    await this.page.click(this.confirmButton);

    await Promise.race([
      this.page.waitForSelector(this.successMessage),
      this.page.waitForSelector(this.errorMessage)
    ]);
  }

  async cancelClass(classId) {
    await this.page.click(this.cancelClassButton(classId));
    await this.page.waitForSelector(this.confirmDialog);
    await this.page.click(this.confirmButton);

    await Promise.race([
      this.page.waitForSelector(this.successMessage),
      this.page.waitForSelector(this.errorMessage)
    ]);
  }

  async getClasses() {
    const classRows = await this.page.locator(`${this.classesTable} tbody tr`).all();
    const classes = [];

    for (const row of classRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 5) {
        classes.push({
          title: await cells[0].textContent(),
          coach: await cells[1].textContent(),
          datetime: await cells[2].textContent(),
          capacity: await cells[3].textContent(),
          status: await cells[4].textContent()
        });
      }
    }

    return classes;
  }

  async getSuccessMessage() {
    const element = this.page.locator(this.successMessage);
    return await element.isVisible() ? await element.textContent() : null;
  }

  async getErrorMessage() {
    const element = this.page.locator(this.errorMessage);
    return await element.isVisible() ? await element.textContent() : null;
  }

  async getValidationErrors() {
    const element = this.page.locator(this.validationErrors);
    if (await element.isVisible()) {
      const errorItems = await element.locator('li').all();
      const errors = [];
      for (const item of errorItems) {
        errors.push(await item.textContent());
      }
      return errors;
    }
    return [];
  }
}

export class SubscriptionPage {
  constructor(page) {
    this.page = page;

    // Sélecteurs de la page d'abonnement
    this.pageTitle = '[data-testid="subscription-page-title"]';
    this.currentPlan = '[data-testid="current-plan"]';
    this.planDetails = '[data-testid="plan-details"]';
    this.billingHistory = '[data-testid="billing-history"]';
    this.renewalInfo = '[data-testid="renewal-info"]';
    this.changePlanButton = '[data-testid="change-plan-button"]';
    this.cancelSubscriptionButton = '[data-testid="cancel-subscription-button"]';

    // Sélecteurs de facturation
    this.currentBill = '[data-testid="current-bill"]';
    this.basePrice = '[data-testid="base-price"]';
    this.loyaltyDiscount = '[data-testid="loyalty-discount"]';
    this.noShowPenalty = '[data-testid="noshow-penalty"]';
    this.finalAmount = '[data-testid="final-amount"]';

    // Sélecteurs de changement de plan
    this.planSelector = '[data-testid="plan-selector"]';
    this.planOption = (planType) => `[data-testid="plan-option-${planType}"]`;
    this.confirmPlanChangeButton = '[data-testid="confirm-plan-change"]';

    // Messages
    this.noSubscriptionMessage = '[data-testid="no-subscription-message"]';
    this.subscribeNowButton = '[data-testid="subscribe-now-button"]';
    this.expiryWarning = '[data-testid="expiry-warning"]';
  }

  async navigate() {
    await this.page.goto('/subscription');
    await this.page.waitForSelector(this.pageTitle);
  }

  async getCurrentPlan() {
    const planElement = this.page.locator(this.currentPlan);
    if (await planElement.isVisible()) {
      return await planElement.textContent();
    }
    return null;
  }

  async getBillingInfo() {
    await this.page.waitForSelector(this.currentBill);

    return {
      basePrice: await this.page.locator(this.basePrice).textContent(),
      loyaltyDiscount: await this.page.locator(this.loyaltyDiscount).textContent(),
      noShowPenalty: await this.page.locator(this.noShowPenalty).textContent(),
      finalAmount: await this.page.locator(this.finalAmount).textContent()
    };
  }

  async getRenewalInfo() {
    const renewalElement = this.page.locator(this.renewalInfo);
    if (await renewalElement.isVisible()) {
      return await renewalElement.textContent();
    }
    return null;
  }

  async hasSubscription() {
    return await this.page.locator(this.currentPlan).isVisible();
  }

  async hasExpiryWarning() {
    return await this.page.locator(this.expiryWarning).isVisible();
  }

  async changePlan(newPlanType) {
    await this.page.click(this.changePlanButton);
    await this.page.waitForSelector(this.planSelector);

    await this.page.click(this.planOption(newPlanType));
    await this.page.click(this.confirmPlanChangeButton);

    // Attendre la confirmation
    await this.page.waitForTimeout(2000);
  }

  async subscribeNow() {
    await this.page.click(this.subscribeNowButton);
    await this.page.waitForURL('/subscription/plans');
  }

  async getBillingHistory() {
    const historyRows = await this.page.locator(`${this.billingHistory} tbody tr`).all();
    const history = [];

    for (const row of historyRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 4) {
        history.push({
          period: await cells[0].textContent(),
          amount: await cells[1].textContent(),
          status: await cells[2].textContent(),
          date: await cells[3].textContent()
        });
      }
    }

    return history;
  }
}

// Utilitaires communs pour tous les page objects
export class CommonActions {
  constructor(page) {
    this.page = page;
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `tests/e2e/reports/screenshots/${name}.png`,
      fullPage: true
    });
  }

  async waitForElement(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async clickAndWait(selector, waitFor) {
    await this.page.click(selector);
    if (waitFor) {
      await this.page.waitForSelector(waitFor);
    }
  }

  async fillAndValidate(selector, value, validationSelector) {
    await this.page.fill(selector, value);
    if (validationSelector) {
      await this.page.waitForSelector(validationSelector);
    }
  }

  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async getElementText(selector) {
    const element = this.page.locator(selector);
    return await element.isVisible() ? await element.textContent() : null;
  }

  async isElementVisible(selector) {
    return await this.page.locator(selector).isVisible();
  }

  async waitForApiResponse(urlPattern, method = 'GET') {
    return await this.page.waitForResponse(response =>
      response.url().includes(urlPattern) && response.request().method() === method
    );
  }

  async mockApiResponse(urlPattern, responseData, status = 200) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }
}
