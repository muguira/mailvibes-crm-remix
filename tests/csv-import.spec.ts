import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('CSV Import Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the import page
    // Note: You'll need to implement authentication in your E2E tests
    await page.goto('/import')
  })

  test('should complete full CSV import workflow', async ({ page }) => {
    // Step 1: Select a File
    await expect(page.locator('h2:has-text("Select a CSV file")')).toBeVisible()

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]')
    const csvPath = path.join(__dirname, 'sample-data.csv')
    await fileInput.setInputFiles(csvPath)

    // Verify file was uploaded
    await expect(page.locator('text=sample-data.csv')).toBeVisible()
    await expect(page.locator('text=9 columns, 5 rows')).toBeVisible()

    // Set list name
    await page.fill('input[placeholder="My Imported Accounts"]', 'Test Import List')

    // Select accounts radio button
    await page.click('input[value="accounts"]')

    // Click Next
    await page.click('button:has-text("Next")')

    // Step 2: Contact Properties
    await expect(page.locator('h2:has-text("Import Contact Properties")')).toBeVisible()

    // Drag Contact Name to Name field
    await page.dragAndDrop('text=Contact Name', 'text=Name*Required >> ..')

    // Select Full Name from dropdown
    await page.click('button[id="name-type-select"]')
    await page.click('text=Contact Full Name')

    // Drag Email to Email field
    await page.dragAndDrop('text=Email', 'text=Email*Required >> ..')

    // Drag Phone to Phone field
    await page.dragAndDrop('text=Phone', 'text=PhoneDrag a field here >> ..')

    // Click Next
    await page.click('button:has-text("Next")')

    // Step 3: Account Properties
    await expect(page.locator('h2:has-text("Import Account Properties")')).toBeVisible()

    // Drag Account Name to Name field
    await page.dragAndDrop('text=Account Name', 'text=Name*Required >> ..')

    // Drag Industry to Industry field
    await page.dragAndDrop('text=Industry', 'text=IndustryDrag a field here >> ..')

    // Check "Also add as list field" for Industry
    await page.check('input[type="checkbox"][id="industry-list-field"]')

    // Click Next
    await page.click('button:has-text("Next")')

    // Step 4: List Fields
    await expect(page.locator('h2:has-text("Import Fields to a New List")')).toBeVisible()

    // Drag Status to Relationship Name
    await page.dragAndDrop('text=Status', 'text=Relationship Name >> ..')

    // Drag Owner to Add a Field
    await page.dragAndDrop('text=Owner', 'text=Add a Field >> ..')

    // Define field in modal
    await expect(page.locator('text=Define List Field')).toBeVisible()
    await page.fill('input[placeholder="Enter field name"]', 'Deal Owner')
    await page.selectOption('select', 'text')
    await page.click('button:has-text("Confirm")')

    // Drag Estimated Deal Size to Add a Field
    await page.dragAndDrop('text=Estimated Deal Size', 'text=Add a Field >> ..')

    // Define field in modal
    await page.fill('input[placeholder="Enter field name"]', 'Deal Size')
    await page.selectOption('select', 'number')
    await page.click('button:has-text("Confirm")')

    // Click Next
    await page.click('button:has-text("Next")')

    // Step 5: Review & Complete
    await expect(page.locator('h2:has-text("Review and Complete Your Import")')).toBeVisible()

    // Verify preview data
    await expect(page.locator('text=name: Malcolm McDonald')).toBeVisible()
    await expect(page.locator('text=email: malcolm@relateiq.com')).toBeVisible()
    await expect(page.locator('text=name: RelateIQ')).toBeVisible()
    await expect(page.locator('text=industry: Software')).toBeVisible()

    // Verify list fields table
    await expect(page.locator('th:has-text("Relationship Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Deal Owner")')).toBeVisible()
    await expect(page.locator('th:has-text("Deal Size")')).toBeVisible()

    // Click Complete Import
    await page.click('button:has-text("Complete Import")')

    // Wait for import to complete
    await expect(page.locator('text=Importing...')).toBeVisible()

    // Verify success toast
    await expect(page.locator('text=Import completed!')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('text=Successfully created:')).toBeVisible()

    // Should redirect to leads page
    await expect(page).toHaveURL('/leads', { timeout: 10000 })
  })

  test('should allow editing from review page', async ({ page }) => {
    // Quick navigation to review page (assuming data is already set up)
    // ... (navigate through steps quickly)

    // Click edit pencil for Contact Properties
    await page.click('button:has(svg[class*="Pencil"]) >> nth=0')

    // Should navigate back to Contact Properties step
    await expect(page.locator('h2:has-text("Import Contact Properties")')).toBeVisible()

    // Make changes and navigate back to review
    // ... (make changes and click Next through steps)
  })

  test('should validate required fields', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    const csvPath = path.join(__dirname, 'sample-data.csv')
    await fileInput.setInputFiles(csvPath)

    // Try to proceed without list name
    await page.click('button:has-text("Next")')

    // Should not advance
    await expect(page.locator('h2:has-text("Select a CSV file")')).toBeVisible()

    // Add list name and proceed
    await page.fill('input[placeholder="My Imported Accounts"]', 'Test List')
    await page.click('button:has-text("Next")')

    // Should advance to Contact Properties
    await expect(page.locator('h2:has-text("Import Contact Properties")')).toBeVisible()

    // Try to proceed without mapping required fields
    await page.click('button:has-text("Next")')

    // Should not advance (Next button should be disabled)
    await expect(page.locator('button:has-text("Next")[disabled]')).toBeVisible()
  })
})
