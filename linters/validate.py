from datetime import date
from pathlib import Path
import sys

from iso3166 import countries
from vladiate import Vlad
from vladiate.inputs import LocalFile
from vladiate.validators import (
    NotEmptyValidator,
    CastValidator,
    Ignore,
    SetValidator,
    Validator,
    ValidationException)


FOLDER = Path(__file__).resolve().parent.parent


# NOTE: This validator doesn't actually use the field argument, but it
# needs to be registered on a field in order to be used.
class RowLengthValidator(Validator):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.invalid_rows = []

    def validate(self, field, row):
        # `csv.DictReader` uses its `restkey` attributes to store values
        # left over after consuming the expected number of values based
        # on the header row. If the row contains `None` here, that means
        # the row was longer than expected. Note that this currently
        # only handles the default value of `None` and does not have
        # access to the `DictReader` instance to lookup the configured
        # `restkey` attribute. `vladiate` does not modify this attribute
        # as of the time of writing this validator, so we use the
        # default of `None` in our checks. `None` is not an expected
        # valid key for standard `DictReader` use.
        if None in row.keys():
            self.invalid_rows.append(row)
            expected_length = len(row) - 1
            length = len(row) + len(row[None]) - 1
            raise ValidationException(
                f'Expected {expected_length} fields, got {length}')

        # Similarly, there is a `csv.DictReader.restval` attribute that
        # handles the case where there are fewer than expected rows.
        if None in row.values():
            self.invalid_rows.append(row)
            expected_length = len(row)
            length = len([
                value for value in row.values() if value is not None])
            raise ValidationException(
                f'Expected {expected_length} fields, got {length}')

    @property
    def bad(self):
        return self.invalid_rows


class ISOFormatDateValidator(CastValidator):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cast = date.fromisoformat


class ConferencesValidator(Vlad):

    def __init__(self, *args, **kwargs):
        # See https://github.com/di/vladiate/issues/35 for the reason
        # this needs to be defined in __init__ instead of at the class
        # level.
        self.validators = {
            'Subject': [NotEmptyValidator(), RowLengthValidator()],
            'Start Date': [ISOFormatDateValidator()],
            'End Date': [ISOFormatDateValidator()],
            'Location': [Ignore()],
            'Country': [
                SetValidator(
                    valid_set={country.alpha3 for country in countries},
                    empty_ok=True)],
            'Venue': [Ignore()],
            'Tutorial Deadline': [ISOFormatDateValidator(empty_ok=True)],
            'Talk Deadline': [ISOFormatDateValidator(empty_ok=True)],
            'Website URL': [Ignore()],
            'Proposal URL': [Ignore()],
            'Sponsorship URL': [Ignore()]}
        super().__init__(*args, **kwargs)


def main():
    any_error = False
    for path in sorted(FOLDER.glob('*.csv')):
        error = not ConferencesValidator(source=LocalFile(path)).validate()
        any_error = any_error or error
    sys.exit(any_error)


if __name__ == '__main__':
    main()
