import { expect, test } from "@playwright/test";

test("opens the feedback widget and confirms a submitted message", async ({ page }) => {
  await page.route("**/api/feedback", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Feedback" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "How is it going?" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("What would you like to share?").selectOption("idea");
  await dialog.getByLabel("Your message").fill("The reading flow feels great.");
  await dialog.getByRole("button", { name: "Send feedback" }).click();

  await expect(dialog.getByRole("status")).toContainText("Thank you for sharing.");
  await expect(dialog.getByText("Your feedback has been sent to the DiscipleOS team.")).toBeVisible();
});