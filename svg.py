import os
import requests
import hashlib
from urllib3.exceptions import NewConnectionError
from imagesoup import ImageSoup, ImageResult
from multiprocessing.pool import ThreadPool
from retrying import retry

IMAGES_DEST = './svg'
soup = ImageSoup()
md5 = hashlib.md5()

def retry_if_io_error(exception):
    """Return True if we should retry (in this case when it's an IOError), False otherwise"""
    return isinstance(exception, IOError)


def retry_if_not_timeout(exception):
    return not isinstance(exception, NewConnectionError)

@retry(retry_on_exception=retry_if_io_error, wait_exponential_multiplier=1000, wait_exponential_max=60000)
def load_images(word):
    return soup.search('logo ' + word, image_type='svg', n_images=12345)

# @retry(retry_on_exception=retry_if_not_timeout, wait_random_min=1000, wait_random_max=3000, stop_max_attempt_number=2)
def save(image_data):
    if image_data['ou'] is not None:
        url = image_data['ou']
        name = os.path.basename(url).split('.', 1)[0]
        filename = '{}-{}.svg'.format(name, hashlib.sha224(url.encode('utf-8')).hexdigest()[:10])
        path = os.path.join(IMAGES_DEST, filename)

        if not os.path.exists(path):
            r = requests.get(url, stream=True, timeout=5, verify=False)

            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024):
                    if chunk: # filter out keep-alive new chunks
                        f.write(chunk)

            with open(os.path.join(IMAGES_DEST, filename+'.txt'), 'w') as f:
                f.write(str(image_data))

        return url

def safe_save(image_data):
    try:
        return save(image_data)
    except Exception as e:
        return e

pool = ThreadPool(356)

with open('./google-10000-english-usa-no-swears.txt') as f:
    lines = f.readlines()

    for i, line in enumerate(lines[1503:]):
        print('Processing word #{}: {}'.format(i, line))
        images = load_images(line)

        result = pool.imap_unordered(safe_save, images)

        for j, url in enumerate(result):
            print('Processed image #{}: {}'.format(j, url))
