const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const completionMessage = document.getElementById("completion-message");
const calculatorInputs = [
    "adults",
    "children",
    "youngest-child-age",
    "pets",
    "days",
    "tablet-litres-per-unit"
].map((id) => document.getElementById(id));
const storedWaterInput = document.getElementById("water-stored-qty");
const waterCheckbox = document.getElementById("water-stock-check");
const tabletsInput = document.getElementById("water-purification-tablets-qty");
const containersInput = document.getElementById("reusable-containers-qty");
const firstAidInput = document.getElementById("first-aid-kit-qty");
const batteriesInput = document.getElementById("extra-batteries-qty");
const foodItems = [
    { key: "tinned", checkboxId: "tinned-food", inputId: "tinned-food-qty", statusId: "tinned-food-status", unit: "meals" },
    { key: "staples", checkboxId: "rice-pasta", inputId: "rice-pasta-qty", statusId: "rice-pasta-status", unit: "servings" },
    { key: "produce", checkboxId: "canned-fruits-vegetables", inputId: "canned-fruits-vegetables-qty", statusId: "canned-fruits-vegetables-status", unit: "servings" },
    { key: "bars", checkboxId: "energy-bars", inputId: "energy-bars-qty", statusId: "energy-bars-status", unit: "bars" }
];
let requiredWater = 0;
let requiredMeals = 0;
let requiredFoodMix = { tinned: 0, staples: 0, produce: 0, bars: 0 };

const storageManagedCheckboxes = new Set([
    waterCheckbox,
    document.getElementById("reusable-containers"),
    document.getElementById("first-aid-kit"),
    document.getElementById("extra-batteries"),
    ...foodItems.map((item) => document.getElementById(item.checkboxId))
]);

checkboxes.forEach((checkbox) => {
    if (!storageManagedCheckboxes.has(checkbox)) {
        checkbox.checked = localStorage.getItem(checkbox.id) === "true";
    }

    checkbox.addEventListener("change", () => {
        if (!storageManagedCheckboxes.has(checkbox)) {
            localStorage.setItem(checkbox.id, checkbox.checked);
        }
        updateProgress();
    });
});

function updateProgress() {
    const visibleCheckboxes = Array.from(checkboxes).filter(
        (checkbox) => !checkbox.closest("[hidden]")
    );
    const total = visibleCheckboxes.length;
    const checked = visibleCheckboxes.filter((checkbox) => checkbox.checked).length;
    const remaining = total - checked;
    const percentage = total === 0 ? 0 : (checked / total) * 100;

    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor =
        percentage < 50 ? "#dc3545" : percentage < 80 ? "#ffc107" : "#28a745";
    progressBar.setAttribute("aria-valuenow", String(Math.round(percentage)));
    progressText.textContent =
        `${checked} ticked, ${remaining} left (${Math.round(percentage)}%)`;
    completionMessage.textContent =
        total > 0 && checked === total
            ? "Emergency stockpile complete!"
            : "";
}

function getNonNegativeNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatAmount(amount) {
    return String(Number(amount.toFixed(1)));
}

function updateStockStatus() {
    const storedWater = getNonNegativeNumber(storedWaterInput);
    updateTrackedStock(
        waterCheckbox,
        document.getElementById("water-stock-status"),
        storedWater,
        requiredWater,
        "litres",
        "Water"
    );
    foodItems.forEach((item) => {
        updateTrackedStock(
            document.getElementById(item.checkboxId),
            document.getElementById(item.statusId),
            getNonNegativeNumber(document.getElementById(item.inputId)),
            requiredFoodMix[item.key],
            item.unit,
            itemLabel(item.key)
        );
    });
    updateTrackedStock(
        document.getElementById("reusable-containers"),
        document.getElementById("containers-stock-status"),
        getNonNegativeNumber(containersInput),
        requiredWater,
        "litres of capacity",
        "Container capacity"
    );

    const tabletRate = getNonNegativeNumber(
        document.getElementById("tablet-litres-per-unit")
    );
    const tabletsCheckbox = document.getElementById("water-purification-tablets");
    const tabletsStatus = document.getElementById("tablets-stock-status");
    if (tabletRate > 0) {
        updateTrackedStock(
            tabletsCheckbox,
            tabletsStatus,
            getNonNegativeNumber(tabletsInput),
            Math.ceil(requiredWater / tabletRate),
            "tablets",
            "Water purification tablets"
        );
    } else {
        tabletsStatus.textContent =
            "Check the package dosage and enter the litres treated per tablet in the calculator.";
        tabletsStatus.className = "stock-status guidance";
    }

    const householdSize =
        getNonNegativeNumber(document.getElementById("adults")) +
        getNonNegativeNumber(document.getElementById("children")) +
        getNonNegativeNumber(document.getElementById("pets"));
    updateTrackedStock(
        document.getElementById("first-aid-kit"),
        document.getElementById("first-aid-stock-status"),
        getNonNegativeNumber(firstAidInput),
        householdSize > 0 ? 1 : 0,
        "kits",
        "First-aid kits"
    );

    const days = getNonNegativeNumber(document.getElementById("days"));
    updateTrackedStock(
        document.getElementById("extra-batteries"),
        document.getElementById("batteries-stock-status"),
        getNonNegativeNumber(batteriesInput),
        Math.ceil(days / 3),
        "packs",
        "Battery packs"
    );
}

function updateTrackedStock(checkbox, status, stored, required, unit, itemName) {
    const shortfall = Math.max(0, required - stored);
    const sufficient = shortfall === 0;
    const displayedUnit = required === 1 ? singularUnit(unit) : unit;
    const shortfallUnit = shortfall === 1 ? singularUnit(unit) : unit;

    checkbox.checked = sufficient;
    status.textContent = sufficient
        ? `${itemName}: enough stored (${formatAmount(stored)} of ${formatAmount(required)} ${displayedUnit}).`
        : `${itemName}: short by ${formatAmount(shortfall)} ${shortfallUnit}.`;
    status.className = sufficient
        ? "stock-status sufficient"
        : "stock-status shortfall";
}

function singularUnit(unit) {
    const singularForms = {
        litres: "litre",
        "meals/portions": "meal/portion",
        "litres of capacity": "litre of capacity",
        tablets: "tablet",
        kits: "kit",
        packs: "pack",
        meals: "meal",
        servings: "serving",
        bars: "bar"
    };
    return singularForms[unit] || unit;
}

function itemLabel(key) {
    const labels = {
        tinned: "Tinned food",
        staples: "Rice and pasta",
        produce: "Canned fruits and vegetables",
        bars: "Energy bars"
    };
    return labels[key];
}

function calculateRequirements() {
    const adults = Math.floor(getNonNegativeNumber(document.getElementById("adults")));
    const children = Math.floor(getNonNegativeNumber(document.getElementById("children")));
    const childAgeInput = document.getElementById("youngest-child-age");
    const childAge = childAgeInput.value.trim() === ""
        ? null
        : Math.floor(getNonNegativeNumber(childAgeInput));
    const pets = Math.floor(getNonNegativeNumber(document.getElementById("pets")));
    const days = Math.floor(getNonNegativeNumber(document.getElementById("days")));
    const people = adults + children;
    const tabletRate = getNonNegativeNumber(
        document.getElementById("tablet-litres-per-unit")
    );

    requiredWater = ((adults * 2) + children + pets) * days;
    requiredMeals = people * days;
    requiredFoodMix = allocateFoodPortions(requiredMeals);
    const requiredTablets = tabletRate > 0
        ? Math.ceil(requiredWater / tabletRate)
        : null;
    const householdCount = people + pets > 0 ? 1 : 0;
    updateChildAgeControls(children, childAge);

    const results = document.getElementById("results");
    results.innerHTML = `
        <h3>Recommended Stockpile</h3>
        <p><strong>Total Water:</strong> ${formatAmount(requiredWater)} Litres</p>
        <p><strong>Total Food:</strong> ${formatAmount(requiredMeals)} meals/portions</p>
        <p><strong>Suggested food amounts:</strong> Tinned meals: ${requiredFoodMix.tinned}; rice/pasta servings: ${requiredFoodMix.staples}; canned fruit/vegetable servings: ${requiredFoodMix.produce}; energy bars: ${requiredFoodMix.bars}. These amounts split the total food target for variety.</p>
        <p><strong>Water Purification Tablets:</strong> ${requiredTablets === null
            ? "Enter the package dosage to calculate."
            : `${requiredTablets} tablets (using the package dosage entered).`}</p>
        <p><strong>Reusable Container Capacity:</strong> ${formatAmount(requiredWater)} Litres</p>
        <p><strong>First-aid Kits:</strong> ${householdCount}</p>
        <p><strong>Emergency Food Packs:</strong> ${Math.ceil(days / 7)}</p>
        <p><strong>Battery Packs:</strong> ${Math.ceil(days / 3)} (estimate: one pack per three days)</p>
        <p><strong>Radio, camping stove, camping toilet:</strong> ${householdCount} of each (one per household).</p>
        <p><strong>Blankets/sleeping bags:</strong> ${people} (one per person).</p>
        <p><strong>Identification copies:</strong> ${people} (one per person); insurance and emergency-contact copies: ${householdCount} set each.</p>
        <p><strong>People Covered:</strong> ${formatAmount(people)}</p>
        <p>Personal medicines, nappies, hygiene products, fuel and waste bags depend on individual use or package instructions; check those amounts for your household.</p>
    `;

    updateStockStatus();
    updateProgress();
}

function updateChildAgeControls(children, childAge) {
    const ageField = document.getElementById("child-age-field");
    const ageLabel = document.getElementById("child-age-label");
    const ageHint = document.getElementById("child-age-hint");
    const diaperItem = document.getElementById("child-diaper-item");
    const diaperLabel = document.getElementById("child-diaper-label");
    const nappiesCheckbox = document.getElementById("nappies");
    const hasChildren = children > 0;

    ageField.hidden = !hasChildren;
    ageLabel.textContent = children > 1
        ? "Youngest child's age (years):"
        : "Child's age (years):";
    ageHint.textContent = hasChildren && childAge === null
        ? "Enter the age to show the appropriate nappy or pull-up checklist option."
        : "";

    const needsDiapers = hasChildren && childAge !== null && childAge < 10;
    diaperItem.hidden = !needsDiapers;
    if (childAge >= 5 && childAge < 10) {
        diaperLabel.textContent = "Pull-ups (optional)";
    } else {
        diaperLabel.textContent = "Nappies (if applicable)";
    }

    if (!needsDiapers) {
        nappiesCheckbox.checked = false;
        localStorage.removeItem(nappiesCheckbox.id);
    }
}

function allocateFoodPortions(total) {
    const categories = [
        { key: "tinned", share: 0.5 },
        { key: "staples", share: 0.25 },
        { key: "produce", share: 0.15 },
        { key: "bars", share: 0.1 }
    ];
    const portions = categories.map((category, index) => {
        const exact = total * category.share;
        return {
            key: category.key,
            amount: Math.floor(exact),
            remainder: exact - Math.floor(exact),
            index
        };
    });
    let remaining = total - portions.reduce((sum, item) => sum + item.amount, 0);

    portions
        .slice()
        .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
        .slice(0, remaining)
        .forEach((item) => {
            portions[item.index].amount += 1;
            remaining -= 1;
        });

    return portions.reduce((result, item) => {
        result[item.key] = item.amount;
        return result;
    }, {});
}

calculatorInputs.forEach((input) => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue !== null) {
        input.value = savedValue;
    }

    input.addEventListener("input", () => {
        localStorage.setItem(input.id, input.value);
        calculateRequirements();
    });
    input.addEventListener("change", calculateRequirements);
});

[storedWaterInput].forEach((input) => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue !== null) {
        input.value = savedValue;
    }

    input.addEventListener("input", () => {
        localStorage.setItem(input.id, input.value);
        updateStockStatus();
        updateProgress();
    });
});

const otherQuantityInputs = Array.from(
    document.querySelectorAll('input[type="number"]')
).filter(
    (input) =>
        !calculatorInputs.includes(input) &&
        input !== storedWaterInput
);

otherQuantityInputs.forEach((input) => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue !== null) {
        input.value = savedValue;
    }

    input.addEventListener("input", () => {
        localStorage.setItem(input.id, input.value);
        calculateRequirements();
    });
});

document.getElementById("calculate-btn").addEventListener("click", calculateRequirements);

calculateRequirements();
