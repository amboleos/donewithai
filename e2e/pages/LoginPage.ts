import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login page object
 * Handles authentication operations
 */
export class LoginPage extends BasePage {
  readonly url: string;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly signInButton: Locator;
  readonly signUpButton: Locator;
  readonly submitButton: Locator;
  readonly signInTab: Locator;
  readonly signUpTab: Locator;
  readonly logo: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.url = '/login';
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.nameInput = page.locator('#name');
    this.signInTab = page.locator('button:has-text("Sign In")');
    this.signUpTab = page.locator('button:has-text("Sign Up")');
    this.submitButton = page.locator('button[type="submit"]');
    this.logo = page.locator('text=DoneWithAI');
    this.pageTitle = page.locator('h1');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto(this.url);
    await this.waitForStable();
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Fill name field (for registration)
   */
  async fillName(name: string) {
    await this.fillInput(this.nameInput, name);
  }

  /**
   * Switch to Sign In tab
   */
  async switchToSignIn() {
    await this.signInTab.click();
  }

  /**
   * Switch to Sign Up tab
   */
  async switchToSignUp() {
    await this.signUpTab.click();
  }

  /**
   * Submit login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform login with email and password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  /**
   * Perform registration with name, email, and password
   */
  async register(name: string, email: string, password: string) {
    await this.switchToSignUp();
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return await this.isVisible(this.emailInput) && await this.isVisible(this.passwordInput);
  }

  /**
   * Check if registration form is visible (includes name field)
   */
  async isRegistrationFormVisible(): Promise<boolean> {
    return await this.isVisible(this.nameInput) && await this.isVisible(this.emailInput) && await this.isVisible(this.passwordInput);
  }

  /**
   * Check if logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    return await this.isVisible(this.logo);
  }

  /**
   * Get error message from toast notification
   */
  async getErrorMessage(): Promise<string | null> {
    const toast = this.page.locator('[data-sonner-toast]').first();
    if (await this.isVisible(toast)) {
      return await this.getText(toast);
    }
    return null;
  }

  /**
   * Wait for success message
   */
  async waitForSuccessMessage(): Promise<string | null> {
    const toast = this.page.locator('[data-sonner-toast]').filter({ hasText: /success|welcome|created/i }).first();
    try {
      await this.waitForVisible(toast, 3000);
      return await this.getText(toast);
    } catch {
      return null;
    }
  }
}
