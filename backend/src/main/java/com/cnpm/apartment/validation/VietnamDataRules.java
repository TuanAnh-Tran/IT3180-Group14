package com.cnpm.apartment.validation;

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

public final class VietnamDataRules {
    public static final String CITIZEN_ID_PREFIX_REGEX = "(001|002|004|006|008|010|011|012|014|015|017|019|020|022|024|025|026|027|030|031|033|034|035|036|037|038|040|042|044|045|046|048|049|051|052|054|056|058|060|062|064|066|067|068|070|072|074|075|077|079|080|082|083|084|086|087|089|091|092|093|094|095|096)";
    public static final String CITIZEN_ID_REGEX = "^" + CITIZEN_ID_PREFIX_REGEX + "\\d{9}$";
    public static final String VIETNAM_MOBILE_REGEX = "^0[35789]\\d{8}$";
    public static final String OPTIONAL_VIETNAM_MOBILE_REGEX = "^(|0[35789]\\d{8})$";
    public static final String OPTIONAL_CITIZEN_ID_REGEX = "^(|" + CITIZEN_ID_PREFIX_REGEX + "\\d{9})$";
    public static final String USERNAME_REGEX = "^[a-z0-9._-]{4,50}$";
    public static final String VIETNAM_PLATE_REGEX = "^[0-9]{2}[A-Z][0-9A-Z]?-[0-9]{3}\\.[0-9]{2}$";

    private static final Pattern CITIZEN_ID = Pattern.compile(CITIZEN_ID_REGEX);
    private static final Pattern MOBILE = Pattern.compile(VIETNAM_MOBILE_REGEX);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern USERNAME = Pattern.compile(USERNAME_REGEX);
    private static final Pattern PLATE = Pattern.compile(VIETNAM_PLATE_REGEX);

    private VietnamDataRules() {
    }

    public static String requireCitizenId(String value, String label) {
        String normalized = requireText(value, label);
        if (!CITIZEN_ID.matcher(normalized).matches()) {
            throw new RuntimeException(label + " must contain exactly 12 digits and start with a valid Vietnamese province/city code.");
        }
        return normalized;
    }

    public static String optionalCitizenId(String value, String label) {
        String normalized = optionalText(value);
        if (normalized == null) {
            return null;
        }
        return requireCitizenId(normalized, label);
    }

    public static String requireVietnamMobile(String value, String label) {
        String normalized = requireText(value, label);
        if (!MOBILE.matcher(normalized).matches()) {
            throw new RuntimeException(label + " must be a Vietnamese mobile number with 10 digits starting with 03, 05, 07, 08 or 09.");
        }
        return normalized;
    }

    public static String optionalVietnamMobile(String value, String label) {
        String normalized = optionalText(value);
        if (normalized == null) {
            return null;
        }
        return requireVietnamMobile(normalized, label);
    }

    public static String requireEmail(String value, String label) {
        String normalized = requireText(value, label).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(normalized).matches()) {
            throw new RuntimeException(label + " must be a valid email address.");
        }
        return normalized;
    }

    public static String requireUsername(String value) {
        String normalized = requireText(value, "Username").toLowerCase(Locale.ROOT);
        if (!USERNAME.matcher(normalized).matches()) {
            throw new RuntimeException("Username must be 4-50 characters and may contain lowercase letters, digits, dots, underscores or hyphens.");
        }
        return normalized;
    }

    public static String requirePassword(String value) {
        String normalized = requireText(value, "Password");
        if (normalized.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters long.");
        }
        return normalized;
    }

    public static String requireVehiclePlate(String value) {
        String normalized = requireText(value, "Vehicle plate number").toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        if (!PLATE.matcher(normalized).matches()) {
            throw new RuntimeException("Vehicle plate number must use Vietnamese format, for example 29A1-123.45.");
        }
        return normalized;
    }

    public static LocalDate notFuture(LocalDate value, String label) {
        if (value != null && value.isAfter(LocalDate.now())) {
            throw new RuntimeException(label + " cannot be in the future.");
        }
        return value;
    }

    public static void validateResidentDates(LocalDate dateOfBirth, LocalDate issueDate, boolean alive, LocalDate dateOfDeath) {
        notFuture(dateOfBirth, "Date of birth");
        notFuture(issueDate, "Citizen ID issue date");
        notFuture(dateOfDeath, "Date of death");

        if (dateOfBirth != null && issueDate != null && issueDate.isBefore(dateOfBirth)) {
            throw new RuntimeException("Citizen ID issue date cannot be before date of birth.");
        }
        if (dateOfBirth != null && dateOfDeath != null && dateOfDeath.isBefore(dateOfBirth)) {
            throw new RuntimeException("Date of death cannot be before date of birth.");
        }
        if (alive && dateOfDeath != null) {
            throw new RuntimeException("Alive residents cannot have a date of death.");
        }
        if (!alive && dateOfDeath == null) {
            throw new RuntimeException("Date of death is required when resident is not alive.");
        }
    }

    public static String requireText(String value, String label) {
        String normalized = optionalText(value);
        if (normalized == null) {
            throw new RuntimeException(label + " is required.");
        }
        return normalized;
    }

    public static String optionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
