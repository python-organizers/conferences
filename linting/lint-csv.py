import os
import subprocess
import sys


CSV_PATH = os.path.join(os.path.dirname(__file__), '..')

# This is the default csvclean message
# when there are no errors
NO_ERRORS_MSG = 'No errors.\n'


def main():
    is_error = False
    for filename in os.listdir(CSV_PATH):
        if not filename.endswith('.csv'):
            continue

        filepath = os.path.join(CSV_PATH, filename)

        # In the future, csvclean will probably set the status code
        # when there are CSV validation errors
        # See: https://github.com/wireservice/csvkit/pull/781
        output = subprocess.check_output(
            ['csvclean', '-n', filepath],
            stderr=subprocess.STDOUT,
            text=True,
        )
        if output != NO_ERRORS_MSG:
            print(output)
            is_error = True

    if is_error:
        sys.exit(1)


if __name__ == '__main__':
    main()
