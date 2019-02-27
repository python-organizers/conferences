import os
import subprocess
import sys


CSV_PATH = os.path.join(os.path.dirname(__file__), '..')

# This is the default csvclean message
# when there are no errors
NO_ERRORS_MSG = b'No errors.\n'


def main():
    is_error = False
    for filename in os.listdir(CSV_PATH):
        if filename.endswith('.csv'):
            filepath = os.path.join(CSV_PATH, filename)

            # In the future, csvclean will probably set the status code
            # when there are CSV validation errors
            # See: https://github.com/wireservice/csvkit/pull/781
            output_bytes = subprocess.check_output(
                ['csvclean', '-n', filepath],
                stderr=subprocess.STDOUT,
            )
            if output_bytes != NO_ERRORS_MSG:
                print(output_bytes.decode('utf-8'))
                is_error = True

    if is_error:
        sys.exit(1)


if __name__ == '__main__':
    main()
