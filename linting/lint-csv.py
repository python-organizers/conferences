import subprocess
import sys
import textwrap
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent

# This is the default csvclean message when there are no errors
NO_ERRORS_MSG = 'No errors.\n'


def main():
    is_error = False
    for path in CSV_PATH.glob('*.csv'):

        # In the future, csvclean will probably set the status code
        # when there are CSV validation errors
        # See: https://github.com/wireservice/csvkit/pull/781
        output = subprocess.check_output(
            ['csvclean', '-n', str(path)],
            stderr=subprocess.STDOUT,
            text=True,
        )
        if output != NO_ERRORS_MSG:
            print(f"Errors in {path}:")
            print(textwrap.indent(output, prefix="    "))
            is_error = True

    sys.exit(is_error)


if __name__ == '__main__':
    main()
